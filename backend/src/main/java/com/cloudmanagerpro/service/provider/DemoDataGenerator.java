package com.cloudmanagerpro.service.provider;

import com.cloudmanagerpro.model.CloudAccount;
import com.cloudmanagerpro.model.CloudResource;
import com.cloudmanagerpro.model.CostDaily;
import com.cloudmanagerpro.model.enums.Provider;
import com.cloudmanagerpro.model.enums.ResourceType;
import com.cloudmanagerpro.model.enums.WasteState;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Produces realistic synthetic resources, costs and metrics so the dashboard is fully populated with
 * zero cloud credentials. Resource identifiers and attributes are deterministic per account (seeded by
 * account id) so repeated syncs upsert the same logical resources rather than duplicating them.
 */
@Component
public class DemoDataGenerator {

    private static final String[] REGIONS = {"us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"};
    private static final String[] HEALTHY_TYPES = {"t3.large", "m5.large", "c5.large", "m5.xlarge", "t3.medium"};
    private static final String[] ENVIRONMENTS = {"dev", "staging", "production", "test"};
    private static final String[] PROJECTS = {"atlas", "phoenix", "orion", "nebula", "titan"};
    private static final String[] OWNERS = {"alice", "bob", "carol", "dave", "erin"};
    private static final String[] APP_NAMES = {
            "web", "api", "worker", "batch", "cache", "db", "queue", "auth", "search", "stream"};
    private static final String[] COST_SERVICES = {
            "Compute", "Block Storage", "Managed Database", "Object Storage", "Data Transfer",
            "Monitoring", "Load Balancing"};

    public List<CloudResource> generateResources(CloudAccount account) {
        Random random = new Random(seed(account));
        List<CloudResource> resources = new ArrayList<>();

        // Healthy running compute (no waste, well tagged)
        for (int i = 0; i < 6; i++) {
            String type = HEALTHY_TYPES[random.nextInt(HEALTHY_TYPES.length)];
            resources.add(compute(account, random, type, 25 + random.nextInt(50), "RUNNING", true, false));
        }
        // Underutilized compute (rightsizing candidates)
        for (int i = 0; i < 3; i++) {
            String type = random.nextBoolean() ? "m5.xlarge" : "c5.xlarge";
            resources.add(compute(account, random, type, 6 + random.nextInt(13), "RUNNING", true, false));
        }
        // Idle compute (cleanup IDLE_VM + idle engine)
        for (int i = 0; i < 2; i++) {
            resources.add(compute(account, random, "t3.large", 1 + random.nextInt(3), "RUNNING", false, false));
        }
        // Stopped compute (cleanup STOPPED_VM)
        for (int i = 0; i < 2; i++) {
            resources.add(compute(account, random, "t3.medium", 0, "STOPPED", true, true));
        }
        // Volumes: attached + unattached
        for (int i = 0; i < 2; i++) {
            resources.add(volume(account, random, true, true));
        }
        for (int i = 0; i < 2; i++) {
            resources.add(volume(account, random, false, random.nextBoolean()));
        }
        // Elastic IPs: associated + unused
        resources.add(elasticIp(account, random, true));
        resources.add(elasticIp(account, random, false));
        resources.add(elasticIp(account, random, false));
        // Snapshots: recent + old
        resources.add(snapshot(account, random, 12));
        resources.add(snapshot(account, random, 140));
        resources.add(snapshot(account, random, 210));
        // Managed databases
        resources.add(database(account, random, "db.r5.large", 35 + random.nextInt(30)));
        resources.add(database(account, random, "db.r5.xlarge", 4 + random.nextInt(10)));
        // Load balancer
        resources.add(loadBalancer(account, random));

        return resources;
    }

    public List<CostDaily> generateCostData(CloudAccount account, LocalDate start, LocalDate end) {
        return generateCostData(account, start, end, baselineMonthly(account));
    }

    public List<CostDaily> generateCostData(CloudAccount account, LocalDate start, LocalDate end,
                                            BigDecimal baselineMonthly) {
        Random random = new Random(seed(account) ^ 0x9E3779B97F4A7C15L);
        List<CostDaily> rows = new ArrayList<>();
        double dailyBase = baselineMonthly.doubleValue() / 30.0;
        long totalDays = Math.max(1, start.until(end).getDays() + start.until(end).toTotalMonths() * 30L + 1);
        int dayIndex = 0;
        int spikeDay = (int) Math.max(0, totalDays - 5 - random.nextInt(5));

        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1), dayIndex++) {
            double trend = 1.0 + (dayIndex / Math.max(1.0, (double) totalDays)) * 0.25;
            double spike = dayIndex == spikeDay ? 1.6 : 1.0;
            for (String service : COST_SERVICES) {
                double weight = serviceWeight(service);
                double noise = 0.85 + random.nextDouble() * 0.3;
                double amount = dailyBase * weight * trend * spike * noise;
                if (amount < 0.01) {
                    continue;
                }
                CostDaily row = new CostDaily();
                row.setProvider(account.getProvider());
                row.setUsageDate(date);
                row.setService(service);
                row.setRegion(REGIONS[random.nextInt(REGIONS.length)]);
                row.setAmount(money(amount));
                row.setCurrency("USD");
                rows.add(row);
            }
        }
        return rows;
    }

    public ResourceMetrics metricsFor(CloudResource resource) {
        double avg = resource.getCpuUtilization() != null ? resource.getCpuUtilization() : 0.0;
        double max = Math.min(100.0, avg * 1.6 + 5.0);
        double net = resource.getNetworkInBytes() != null ? resource.getNetworkInBytes() : 0.0;
        double disk = resource.getDiskIoBytes() != null ? resource.getDiskIoBytes() : 0.0;
        return new ResourceMetrics(avg, max, net, disk);
    }

    public BigDecimal baselineMonthly(CloudAccount account) {
        Random random = new Random(seed(account));
        return money(1800 + random.nextInt(2600));
    }

    // ----- resource builders -------------------------------------------------

    private CloudResource compute(CloudAccount account, Random random, String type, int cpu, String status,
                                  boolean fullTags, boolean stopped) {
        CloudResource r = base(account, random, computeType(account.getProvider()), "i");
        r.setName(appName(random) + "-" + status.toLowerCase() + "-" + (random.nextInt(90) + 10));
        r.setInstanceType(type);
        r.setStatus(status);
        r.setCpuUtilization((double) cpu);
        r.setNetworkInBytes(stopped ? 0.0 : (double) (cpu * 1_000_000L + random.nextInt(500_000)));
        r.setDiskIoBytes(stopped ? 0.0 : (double) (cpu * 250_000L + random.nextInt(250_000)));
        r.setMonthlyCost(stopped ? InstanceCatalog.monthlyCost(type).multiply(new BigDecimal("0.15")) : InstanceCatalog.monthlyCost(type));
        r.setLastActivityAt(OffsetDateTime.now().minusHours(stopped ? 24L * (3 + random.nextInt(40)) : random.nextInt(6)));
        applyTags(r, random, fullTags ? 100 : 55);
        return r;
    }

    private CloudResource volume(CloudAccount account, Random random, boolean attached, boolean fullTags) {
        CloudResource r = base(account, random, diskType(account.getProvider()), "vol");
        int size = 20 + random.nextInt(480);
        r.setName(appName(random) + "-data");
        r.setSizeGb(size);
        r.setStatus(attached ? "in-use" : "available");
        r.setMonthlyCost(money(size * 0.10));
        r.getMetadata().put("attached", attached);
        r.getMetadata().put("volumeType", "gp3");
        r.setLastActivityAt(OffsetDateTime.now().minusDays(attached ? random.nextInt(2) : 30L + random.nextInt(120)));
        if (!attached) {
            r.setWasteState(WasteState.UNATTACHED);
        }
        applyTags(r, random, fullTags ? 90 : 40);
        return r;
    }

    private CloudResource elasticIp(CloudAccount account, Random random, boolean associated) {
        CloudResource r = base(account, random, ipType(account.getProvider()), "eip");
        r.setName(appName(random) + "-ip");
        r.setStatus(associated ? "associated" : "unused");
        r.setMonthlyCost(associated ? BigDecimal.ZERO : money(3.60));
        r.getMetadata().put("associated", associated);
        if (!associated) {
            r.setWasteState(WasteState.UNUSED);
        }
        applyTags(r, random, associated ? 80 : 35);
        return r;
    }

    private CloudResource snapshot(CloudAccount account, Random random, int ageDays) {
        CloudResource r = base(account, random, ResourceType.SNAPSHOT, "snap");
        int size = 20 + random.nextInt(400);
        r.setName(appName(random) + "-snapshot");
        r.setSizeGb(size);
        r.setStatus("completed");
        r.setMonthlyCost(money(size * 0.05));
        r.getMetadata().put("ageDays", ageDays);
        r.setLastActivityAt(OffsetDateTime.now().minusDays(ageDays));
        if (ageDays > 90) {
            r.setWasteState(WasteState.OLD_SNAPSHOT);
        }
        applyTags(r, random, ageDays > 90 ? 30 : 70);
        return r;
    }

    private CloudResource database(CloudAccount account, Random random, String type, int cpu) {
        CloudResource r = base(account, random, ResourceType.RDS_INSTANCE, "db");
        r.setName(appName(random) + "-postgres");
        r.setInstanceType(type);
        r.setStatus("available");
        r.setCpuUtilization((double) cpu);
        r.setNetworkInBytes((double) (cpu * 800_000L));
        r.setDiskIoBytes((double) (cpu * 600_000L));
        r.setMonthlyCost(InstanceCatalog.monthlyCost(type));
        r.setLastActivityAt(OffsetDateTime.now().minusHours(random.nextInt(4)));
        applyTags(r, random, 100);
        return r;
    }

    private CloudResource loadBalancer(CloudAccount account, Random random) {
        CloudResource r = base(account, random, ResourceType.LOAD_BALANCER, "elb");
        r.setName(appName(random) + "-alb");
        r.setStatus("active");
        r.setMonthlyCost(money(18 + random.nextInt(10)));
        r.getMetadata().put("requestsPerDay", 50_000 + random.nextInt(400_000));
        applyTags(r, random, 75);
        return r;
    }

    // ----- helpers -----------------------------------------------------------

    private CloudResource base(CloudAccount account, Random random, ResourceType type, String kind) {
        CloudResource r = new CloudResource();
        r.setProvider(account.getProvider());
        r.setResourceType(type);
        r.setExternalId(externalId(account, kind, random));
        r.setRegion(REGIONS[random.nextInt(REGIONS.length)]);
        r.setWasteState(WasteState.NONE);
        r.setMonthlyCost(BigDecimal.ZERO);
        return r;
    }

    private void applyTags(CloudResource r, Random random, int completeness) {
        Map<String, String> tags = new HashMap<>();
        tags.put("Name", r.getName() != null ? r.getName() : "resource");
        if (completeness >= 50) {
            tags.put("owner", OWNERS[random.nextInt(OWNERS.length)]);
        }
        if (completeness >= 60) {
            tags.put("project", PROJECTS[random.nextInt(PROJECTS.length)]);
        }
        if (completeness >= 80) {
            tags.put("environment", ENVIRONMENTS[random.nextInt(ENVIRONMENTS.length)]);
        } else if (completeness >= 45) {
            // Present but invalid value to exercise tag-compliance "invalid" path.
            tags.put("environment", random.nextBoolean() ? "prod" : "QA");
        }
        if (completeness >= 90) {
            tags.put("cost_center", "cc-" + (1000 + random.nextInt(8999)));
        }
        r.setTags(tags);
    }

    private String appName(Random random) {
        return APP_NAMES[random.nextInt(APP_NAMES.length)];
    }

    /**
     * Deterministic provider-native id: stable across syncs (seeded random + fixed generation order)
     * so the upsert in {@code SyncService} matches the same logical resource each time.
     */
    private String externalId(CloudAccount account, String kind, Random random) {
        long accountToken = account.getId() != null
                ? Math.abs(account.getId().getLeastSignificantBits())
                : Math.abs((long) String.valueOf(account.getName()).hashCode());
        String acct = pad6(Long.toHexString(accountToken));
        String suffix = String.format("%08x", random.nextInt());
        return switch (account.getProvider()) {
            case AWS -> kind + "-0" + acct + suffix;
            case AZURE -> "az-" + kind + "-" + acct + suffix;
            case GCP -> "gcp-" + kind + "-" + acct + suffix;
        };
    }

    private String pad6(String s) {
        StringBuilder sb = new StringBuilder(s);
        while (sb.length() < 6) {
            sb.append('0');
        }
        return sb.substring(0, 6);
    }

    private double serviceWeight(String service) {
        return switch (service) {
            case "Compute" -> 0.42;
            case "Managed Database" -> 0.18;
            case "Block Storage" -> 0.12;
            case "Object Storage" -> 0.08;
            case "Data Transfer" -> 0.09;
            case "Load Balancing" -> 0.06;
            case "Monitoring" -> 0.05;
            default -> 0.05;
        };
    }

    private long seed(CloudAccount account) {
        if (account.getId() != null) {
            return account.getId().getMostSignificantBits() ^ account.getId().getLeastSignificantBits();
        }
        return account.getName() != null ? account.getName().hashCode() : 12345L;
    }

    private BigDecimal money(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
    }

    private ResourceType computeType(Provider provider) {
        return provider == Provider.AWS ? ResourceType.EC2_INSTANCE : ResourceType.VM;
    }

    private ResourceType diskType(Provider provider) {
        return provider == Provider.AWS ? ResourceType.EBS_VOLUME : ResourceType.DISK;
    }

    private ResourceType ipType(Provider provider) {
        return provider == Provider.AWS ? ResourceType.ELASTIC_IP : ResourceType.PUBLIC_IP;
    }
}
