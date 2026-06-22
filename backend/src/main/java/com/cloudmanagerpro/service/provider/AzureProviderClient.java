package com.cloudmanagerpro.service.provider;

import com.cloudmanagerpro.model.CloudAccount;
import com.cloudmanagerpro.model.CloudResource;
import com.cloudmanagerpro.model.CostDaily;
import com.cloudmanagerpro.model.enums.ActionType;
import com.cloudmanagerpro.model.enums.Provider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

/**
 * Production-shaped Azure stub. Wired exactly like a real client (connection test, sync, cost,
 * metrics, actions) but backed by {@link DemoDataGenerator}; a real Azure Resource Manager
 * integration would slot in behind these same methods.
 */
@Component
@RequiredArgsConstructor
public class AzureProviderClient implements CloudProviderClient {

    private final DemoDataGenerator demo;

    @Override
    public Provider provider() {
        return Provider.AZURE;
    }

    @Override
    public ConnectionTestResult testConnection(CloudAccount account) {
        return ConnectionTestResult.ok("Connected to Azure (demo mode)", demoSubscriptionId(account));
    }

    @Override
    public List<CloudResource> syncResources(CloudAccount account) {
        return demo.generateResources(account);
    }

    @Override
    public List<CostDaily> fetchCostData(CloudAccount account, LocalDate start, LocalDate end) {
        return demo.generateCostData(account, start, end);
    }

    @Override
    public ResourceMetrics fetchMetrics(CloudAccount account, CloudResource resource) {
        return demo.metricsFor(resource);
    }

    @Override
    public ProviderMode actionMode(CloudAccount account) {
        return ProviderMode.SIMULATED;
    }

    @Override
    public ActionResult executeAction(CloudAccount account, CloudResource resource, ActionType action,
                                      ActionParams params, boolean dryRun) {
        String descriptor = action + " on " + resource.getResourceType() + " " + resource.getExternalId();
        if (dryRun) {
            return ActionResult.ok("Dry run: would " + descriptor + " (Azure simulated)");
        }
        return ActionResult.ok(simulatedMessage(action, resource));
    }

    private String simulatedMessage(ActionType action, CloudResource resource) {
        String target = resource.getResourceType() + " " + resource.getExternalId();
        String suffix = " — connect Azure credentials to run real actions";
        return switch (action) {
            case START -> "Simulated start of " + target + suffix;
            case STOP -> "Simulated stop (deallocate) of " + target + suffix;
            case RESTART -> "Simulated restart of " + target + suffix;
            case RESIZE -> "Simulated resize of " + target + suffix;
            case ADD_TAGS -> "Simulated tag update on " + target + suffix;
            case TERMINATE -> "Simulated delete of " + target + suffix;
            case DELETE_VOLUME -> "Simulated managed-disk delete of " + target + suffix;
            case RELEASE_EIP -> "Simulated public-IP release of " + target + suffix;
            case DELETE_SNAPSHOT -> "Simulated snapshot delete of " + target + suffix;
            default -> "Simulated " + action + " on " + target + " (Azure stub)";
        };
    }

    private String demoSubscriptionId(CloudAccount account) {
        return account.getId() != null ? account.getId().toString() : "00000000-0000-0000-0000-000000000000";
    }
}
