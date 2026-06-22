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
 * Production-shaped GCP stub. Same surface as a real client but backed by {@link DemoDataGenerator};
 * a real Google Cloud Compute/Billing integration would slot in behind these methods.
 */
@Component
@RequiredArgsConstructor
public class GcpProviderClient implements CloudProviderClient {

    private final DemoDataGenerator demo;

    @Override
    public Provider provider() {
        return Provider.GCP;
    }

    @Override
    public ConnectionTestResult testConnection(CloudAccount account) {
        return ConnectionTestResult.ok("Connected to GCP (demo mode)", demoProjectId(account));
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
            return ActionResult.ok("Dry run: would " + descriptor + " (GCP simulated)");
        }
        return ActionResult.ok(simulatedMessage(action, resource));
    }

    private String simulatedMessage(ActionType action, CloudResource resource) {
        String target = resource.getResourceType() + " " + resource.getExternalId();
        String suffix = " — connect GCP credentials to run real actions";
        return switch (action) {
            case START -> "Simulated start of " + target + suffix;
            case STOP -> "Simulated stop of " + target + suffix;
            case RESTART -> "Simulated reset of " + target + suffix;
            case RESIZE -> "Simulated machine-type change of " + target + suffix;
            case ADD_TAGS -> "Simulated label update on " + target + suffix;
            case TERMINATE -> "Simulated delete of " + target + suffix;
            case DELETE_VOLUME -> "Simulated persistent-disk delete of " + target + suffix;
            case RELEASE_EIP -> "Simulated static-IP release of " + target + suffix;
            case DELETE_SNAPSHOT -> "Simulated snapshot delete of " + target + suffix;
            default -> "Simulated " + action + " on " + target + " (GCP stub)";
        };
    }

    private String demoProjectId(CloudAccount account) {
        return "cmp-demo-" + (account.getId() != null
                ? Integer.toHexString(Math.abs(account.getId().hashCode()))
                : "project");
    }
}
