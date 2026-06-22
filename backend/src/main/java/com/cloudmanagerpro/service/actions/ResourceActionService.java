package com.cloudmanagerpro.service.actions;

import com.cloudmanagerpro.dto.ActionResultDto;
import com.cloudmanagerpro.dto.actions.ActionParamsDto;
import com.cloudmanagerpro.dto.actions.ActionRequest;
import com.cloudmanagerpro.dto.actions.AllowedActionDto;
import com.cloudmanagerpro.dto.actions.BulkActionRequest;
import com.cloudmanagerpro.dto.actions.BulkActionResultDto;
import com.cloudmanagerpro.dto.actions.ResourceActionsDto;
import com.cloudmanagerpro.exception.ApiException;
import com.cloudmanagerpro.exception.BadRequestException;
import com.cloudmanagerpro.exception.ResourceNotFoundException;
import com.cloudmanagerpro.model.CloudAccount;
import com.cloudmanagerpro.model.CloudResource;
import com.cloudmanagerpro.model.RightsizingRecommendation;
import com.cloudmanagerpro.model.enums.ActionType;
import com.cloudmanagerpro.model.enums.ResourceType;
import com.cloudmanagerpro.repository.CloudAccountRepository;
import com.cloudmanagerpro.repository.CloudResourceRepository;
import com.cloudmanagerpro.repository.RightsizingRecommendationRepository;
import com.cloudmanagerpro.service.ResourceTypes;
import com.cloudmanagerpro.service.audit.AuditService;
import com.cloudmanagerpro.service.provider.ActionParams;
import com.cloudmanagerpro.service.provider.ActionResult;
import com.cloudmanagerpro.service.provider.ProviderClientFactory;
import com.cloudmanagerpro.service.provider.ProviderMode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Single mutation path for resource actions (Resources drawer, bulk bar, and recommendation "apply").
 * Validates tenant ownership, computes type/state-aware allowed actions, enforces the two-layer safety
 * gate via the provider's {@link ProviderMode}, audits every attempt, and triggers an async re-sync
 * after a real successful execute. Always delegates the actual mutation to
 * {@link com.cloudmanagerpro.service.provider.CloudProviderClient#executeAction} so there is never a
 * second mutation path.
 */
@Service
@RequiredArgsConstructor
public class ResourceActionService {

    private static final List<ActionType> DISPLAY_ORDER = List.of(
            ActionType.START, ActionType.STOP, ActionType.RESTART, ActionType.RESIZE, ActionType.ADD_TAGS,
            ActionType.DELETE_VOLUME, ActionType.RELEASE_EIP, ActionType.DELETE_SNAPSHOT, ActionType.TERMINATE);

    private final CloudResourceRepository resourceRepository;
    private final CloudAccountRepository cloudAccountRepository;
    private final RightsizingRecommendationRepository rightsizingRecommendationRepository;
    private final ProviderClientFactory providerClientFactory;
    private final AuditService auditService;
    private final PostActionSyncService postActionSyncService;

    // ----- public API --------------------------------------------------------

    @Transactional(readOnly = true)
    public ResourceActionsDto listActions(UUID userId, UUID resourceId) {
        CloudResource resource = requireResource(userId, resourceId);
        CloudAccount account = accountFor(userId, resource);
        return new ResourceActionsDto(resource.getId(), resource.getProvider(), resource.getResourceType(),
                resource.getStatus(), mode(account, resource).name(), allowedActions(resource));
    }

    @Transactional
    public ActionResultDto dryRun(UUID userId, UUID resourceId, ActionRequest request) {
        return resourceAction(userId, resourceId, request, true);
    }

    @Transactional
    public ActionResultDto execute(UUID userId, UUID resourceId, ActionRequest request) {
        return resourceAction(userId, resourceId, request, false);
    }

    private ActionResultDto resourceAction(UUID userId, UUID resourceId, ActionRequest request, boolean dryRun) {
        ActionType action = requireAction(request != null ? request.action() : null);
        CloudResource resource = requireResource(userId, resourceId);
        validateActionAllowed(resource, action);
        CloudAccount account = accountFor(userId, resource);

        ActionParamsDto paramsDto = request.params();
        String instanceType = paramsDto != null ? paramsDto.instanceType() : null;
        BigDecimal savingsHint = null;
        // Drawer/bulk RESIZE without an explicit type: default to this resource's rightsizing
        // recommendation. If there is no recommendation, return a friendly result (not a raw 400) so
        // the user is told to pick a target type rather than seeing a validation error.
        if (action == ActionType.RESIZE && !StringUtils.hasText(instanceType)) {
            RightsizingRecommendation recommendation = latestRecommendation(userId, resource.getId());
            if (recommendation == null || !StringUtils.hasText(recommendation.getRecommendedType())) {
                return needsResizeType(resource, account, dryRun);
            }
            instanceType = recommendation.getRecommendedType();
            savingsHint = recommendation.getEstimatedMonthlySavings();
        }

        Map<String, String> tags = paramsDto != null && paramsDto.tags() != null ? paramsDto.tags() : Map.of();
        ActionParams params = new ActionParams(instanceType, tags);
        validateParams(action, params);
        return perform(userId, resource, account, action, params, dryRun,
                dryRun ? null : request.confirmation(), savingsHint, true);
    }

    /** Shared entry point used by rightsizing/idle "apply"; performs full tenant + safety validation. */
    @Transactional
    public ActionResultDto runActionById(UUID userId, UUID resourceId, ActionType action, ActionParams params,
                                         boolean dryRun, String confirmation, BigDecimal savingsHint) {
        ActionType resolved = requireAction(action);
        CloudResource resource = requireResource(userId, resourceId);
        validateActionAllowed(resource, resolved);
        ActionParams resolvedParams = params != null ? params : ActionParams.empty();
        validateParams(resolved, resolvedParams);
        return perform(userId, resource, accountFor(userId, resource), resolved, resolvedParams, dryRun,
                confirmation, savingsHint, true);
    }

    @Transactional
    public BulkActionResultDto bulkDryRun(UUID userId, BulkActionRequest request) {
        return bulk(userId, request, true);
    }

    @Transactional
    public BulkActionResultDto bulkExecute(UUID userId, BulkActionRequest request) {
        return bulk(userId, request, false);
    }

    // ----- bulk --------------------------------------------------------------

    private BulkActionResultDto bulk(UUID userId, BulkActionRequest request, boolean dryRun) {
        ActionType action = requireAction(request != null ? request.action() : null);
        if (request.resourceIds() == null || request.resourceIds().isEmpty()) {
            throw new BadRequestException("resourceIds is required and must be non-empty");
        }
        ActionParams params = toParams(action, request.params());

        List<ActionResultDto> results = new ArrayList<>();
        Set<UUID> accountsToResync = new HashSet<>();
        int succeeded = 0;
        int failed = 0;
        int executed = 0;
        int simulated = 0;

        for (UUID resourceId : request.resourceIds()) {
            ActionResultDto result;
            Optional<CloudResource> found = resourceId != null
                    ? resourceRepository.findByIdAndUserId(resourceId, userId)
                    : Optional.empty();
            if (found.isEmpty()) {
                result = failedResult(action, dryRun, resourceId, null, "Resource not found");
            } else {
                CloudResource resource = found.get();
                try {
                    validateActionAllowed(resource, action);
                    result = perform(userId, resource, accountFor(userId, resource), action, params, dryRun,
                            request.confirmation(), null, false);
                    if (result.executed()) {
                        accountsToResync.add(resource.getCloudAccountId());
                    }
                } catch (ApiException ex) {
                    result = failedResult(action, dryRun, resource.getId(), resource.getName(), ex.getMessage());
                }
            }
            results.add(result);
            if (result.success()) {
                succeeded++;
            } else {
                failed++;
            }
            if (result.executed()) {
                executed++;
            }
            if (result.simulated()) {
                simulated++;
            }
        }
        accountsToResync.forEach(accountId -> postActionSyncService.resyncAccount(userId, accountId));
        return new BulkActionResultDto(action, dryRun, results.size(), succeeded, failed, executed, simulated, results);
    }

    // ----- core --------------------------------------------------------------

    private ActionResultDto perform(UUID userId, CloudResource resource, CloudAccount account, ActionType action,
                                    ActionParams params, boolean dryRun, String confirmation,
                                    BigDecimal savingsHint, boolean autoResync) {
        ProviderMode providerMode = mode(account, resource);

        if (!dryRun && providerMode == ProviderMode.REAL && isDestructive(action)) {
            validateConfirmation(resource, confirmation);
        }

        ActionResult result = invoke(account, resource, action, params, dryRun);
        boolean executed = !dryRun && providerMode == ProviderMode.REAL && result.success();
        boolean simulated = providerMode == ProviderMode.SIMULATED;
        String status = statusLabel(dryRun, executed, simulated, result.success());

        auditService.record(userId, resource, action, dryRun ? "DRY_RUN" : "EXECUTE", dryRun,
                result.success(), result.message(), resolveSavings(action, resource, savingsHint));

        if (executed && autoResync) {
            postActionSyncService.resyncAccount(userId, resource.getCloudAccountId());
        }

        // Optional preview hints — populated only for RESIZE so the confirm dialog can show
        // current → target and the projected saving; null (and ignored) for every other action.
        BigDecimal resizeSavings = action == ActionType.RESIZE ? savingsHint : null;
        String fromType = action == ActionType.RESIZE ? resource.getInstanceType() : null;
        String toType = action == ActionType.RESIZE ? params.instanceType() : null;
        return new ActionResultDto(result.success(), executed, dryRun, simulated, providerMode.name(), action,
                status, resource.getId(), resource.getName(), result.message(), resizeSavings, fromType, toType);
    }

    private ActionResult invoke(CloudAccount account, CloudResource resource, ActionType action,
                                ActionParams params, boolean dryRun) {
        if (account == null) {
            String descriptor = action + " on " + resource.getExternalId() + " (no cloud account)";
            return ActionResult.ok((dryRun ? "Dry run: would " : "Simulated ") + descriptor);
        }
        return providerClientFactory.forProvider(resource.getProvider())
                .executeAction(account, resource, action, params, dryRun);
    }

    // ----- allowed actions ---------------------------------------------------

    private List<AllowedActionDto> allowedActions(CloudResource resource) {
        Set<ActionType> allowed = allowedActionTypes(resource);
        List<AllowedActionDto> actions = new ArrayList<>();
        for (ActionType action : DISPLAY_ORDER) {
            if (allowed.contains(action)) {
                actions.add(new AllowedActionDto(action, label(action), isDestructive(action), true,
                        requiresParams(action), description(action)));
            }
        }
        return actions;
    }

    private Set<ActionType> allowedActionTypes(CloudResource resource) {
        EnumSet<ActionType> actions = EnumSet.of(ActionType.ADD_TAGS);
        ResourceType type = resource.getResourceType();
        String status = resource.getStatus() != null ? resource.getStatus().toLowerCase() : "";
        if (ResourceTypes.isCompute(type)) {
            if (isStopped(status)) {
                actions.add(ActionType.START);
                actions.add(ActionType.RESIZE);
                actions.add(ActionType.TERMINATE);
            } else {
                actions.add(ActionType.STOP);
                actions.add(ActionType.RESTART);
                actions.add(ActionType.RESIZE);
                actions.add(ActionType.TERMINATE);
            }
        } else if (ResourceTypes.isDisk(type)) {
            if (!isAttached(resource)) {
                actions.add(ActionType.DELETE_VOLUME);
            }
        } else if (ResourceTypes.isIp(type)) {
            if (!isAssociated(resource)) {
                actions.add(ActionType.RELEASE_EIP);
            }
        } else if (ResourceTypes.isSnapshot(type)) {
            actions.add(ActionType.DELETE_SNAPSHOT);
        }
        return actions;
    }

    private void validateActionAllowed(CloudResource resource, ActionType action) {
        if (!allowedActionTypes(resource).contains(action)) {
            String state = StringUtils.hasText(resource.getStatus()) ? resource.getStatus() : "unknown";
            throw new BadRequestException(action + " is not available for " + resource.getResourceType()
                    + " in state '" + state + "'");
        }
    }

    // ----- validation helpers ------------------------------------------------

    private ActionType requireAction(ActionType action) {
        if (action == null) {
            throw new BadRequestException("action is required");
        }
        return action;
    }

    private ActionParams toParams(ActionType action, ActionParamsDto dto) {
        String instanceType = dto != null ? dto.instanceType() : null;
        Map<String, String> tags = dto != null && dto.tags() != null ? dto.tags() : Map.of();
        ActionParams params = new ActionParams(instanceType, tags);
        validateParams(action, params);
        return params;
    }

    private void validateParams(ActionType action, ActionParams params) {
        if (action == ActionType.RESIZE && (params == null || !StringUtils.hasText(params.instanceType()))) {
            throw new BadRequestException("RESIZE requires params.instanceType");
        }
        if (action == ActionType.ADD_TAGS && (params == null || params.tags() == null || params.tags().isEmpty())) {
            throw new BadRequestException("ADD_TAGS requires at least one entry in params.tags");
        }
    }

    private void validateConfirmation(CloudResource resource, String confirmation) {
        if (!StringUtils.hasText(confirmation)) {
            throw new BadRequestException(
                    "Confirmation required: type the resource name or DELETE to confirm this destructive action");
        }
        String value = confirmation.trim();
        boolean matches = value.equalsIgnoreCase("DELETE")
                || (StringUtils.hasText(resource.getName()) && value.equalsIgnoreCase(resource.getName().trim()))
                || (StringUtils.hasText(resource.getExternalId())
                && value.equalsIgnoreCase(resource.getExternalId().trim()));
        if (!matches) {
            throw new BadRequestException(
                    "Confirmation does not match: type the resource name or DELETE to confirm");
        }
    }

    private CloudResource requireResource(UUID userId, UUID resourceId) {
        if (resourceId == null) {
            throw new ResourceNotFoundException("Resource not found");
        }
        return resourceRepository.findByIdAndUserId(resourceId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));
    }

    private CloudAccount accountFor(UUID userId, CloudResource resource) {
        if (resource.getCloudAccountId() == null) {
            return null;
        }
        return cloudAccountRepository.findByIdAndUserId(resource.getCloudAccountId(), userId).orElse(null);
    }

    private ProviderMode mode(CloudAccount account, CloudResource resource) {
        return account != null
                ? providerClientFactory.forProvider(resource.getProvider()).actionMode(account)
                : ProviderMode.SIMULATED;
    }

    /** The highest-saving rightsizing recommendation for a resource, used to default a drawer RESIZE type. */
    private RightsizingRecommendation latestRecommendation(UUID userId, UUID resourceId) {
        if (resourceId == null) {
            return null;
        }
        return rightsizingRecommendationRepository.findByUserIdOrderByEstimatedMonthlySavingsDesc(userId).stream()
                .filter(recommendation -> resourceId.equals(recommendation.getResourceId()))
                .findFirst()
                .orElse(null);
    }

    /** Friendly result (HTTP 200, not a 400) when a RESIZE has no target type and no recommendation to fall back on. */
    private ActionResultDto needsResizeType(CloudResource resource, CloudAccount account, boolean dryRun) {
        ProviderMode providerMode = mode(account, resource);
        String message = "No rightsizing recommendation for this instance yet — run a rightsizing analysis "
                + "or choose a target instance type to resize.";
        return new ActionResultDto(false, false, dryRun, providerMode == ProviderMode.SIMULATED,
                providerMode.name(), ActionType.RESIZE, "FAILED", resource.getId(), resource.getName(),
                message, null, resource.getInstanceType(), null);
    }

    private ActionResultDto failedResult(ActionType action, boolean dryRun, UUID resourceId, String resourceName,
                                         String message) {
        return new ActionResultDto(false, false, dryRun, false, ProviderMode.SIMULATED.name(), action, "FAILED",
                resourceId, resourceName, message);
    }

    private BigDecimal resolveSavings(ActionType action, CloudResource resource, BigDecimal hint) {
        if (hint != null) {
            return hint;
        }
        return switch (action) {
            case STOP, TERMINATE, DELETE_VOLUME, RELEASE_EIP, DELETE_SNAPSHOT ->
                    resource.getMonthlyCost() != null ? resource.getMonthlyCost() : BigDecimal.ZERO;
            default -> BigDecimal.ZERO;
        };
    }

    private String statusLabel(boolean dryRun, boolean executed, boolean simulated, boolean success) {
        if (dryRun) {
            return "DRY_RUN";
        }
        if (executed) {
            return "EXECUTED";
        }
        if (simulated) {
            return "SIMULATED";
        }
        return success ? "EXECUTED" : "FAILED";
    }

    private boolean isDestructive(ActionType action) {
        return action == ActionType.TERMINATE || action == ActionType.DELETE_VOLUME
                || action == ActionType.DELETE_SNAPSHOT || action == ActionType.RELEASE_EIP;
    }

    private boolean requiresParams(ActionType action) {
        return action == ActionType.RESIZE || action == ActionType.ADD_TAGS;
    }

    private String label(ActionType action) {
        return switch (action) {
            case START -> "Start";
            case STOP -> "Stop";
            case RESTART -> "Restart";
            case RESIZE -> "Resize";
            case ADD_TAGS -> "Edit tags";
            case TERMINATE -> "Terminate";
            case DELETE_VOLUME -> "Delete volume";
            case RELEASE_EIP -> "Release IP";
            case DELETE_SNAPSHOT -> "Delete snapshot";
            default -> action.name();
        };
    }

    private String description(ActionType action) {
        return switch (action) {
            case START -> "Start the stopped instance";
            case STOP -> "Stop the instance (compute charges pause; storage/IP charges remain)";
            case RESTART -> "Reboot the running instance";
            case RESIZE -> "Change the instance type (the instance is stopped and restarted)";
            case ADD_TAGS -> "Add or update tags on the resource";
            case TERMINATE -> "Permanently terminate the instance";
            case DELETE_VOLUME -> "Permanently delete the unattached volume";
            case RELEASE_EIP -> "Release the unused Elastic IP";
            case DELETE_SNAPSHOT -> "Permanently delete the snapshot";
            default -> "";
        };
    }

    private boolean isStopped(String status) {
        return status.contains("stop") || status.contains("dealloc");
    }

    private boolean isAttached(CloudResource resource) {
        Object attached = resource.getMetadata() != null ? resource.getMetadata().get("attached") : null;
        if (attached instanceof Boolean b) {
            return b;
        }
        String status = resource.getStatus() != null ? resource.getStatus().toLowerCase() : "";
        return status.contains("in-use") || status.contains("attached");
    }

    private boolean isAssociated(CloudResource resource) {
        Object associated = resource.getMetadata() != null ? resource.getMetadata().get("associated") : null;
        if (associated instanceof Boolean b) {
            return b;
        }
        String status = resource.getStatus() != null ? resource.getStatus().toLowerCase() : "";
        return status.contains("associated") || status.contains("in-use");
    }
}
