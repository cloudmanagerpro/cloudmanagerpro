package com.cloudmanagerpro.service.provider;

import com.cloudmanagerpro.config.AppProperties;
import com.cloudmanagerpro.model.CloudAccount;
import com.cloudmanagerpro.model.CloudResource;
import com.cloudmanagerpro.model.CostDaily;
import com.cloudmanagerpro.model.enums.ActionType;
import com.cloudmanagerpro.model.enums.Provider;
import com.cloudmanagerpro.model.enums.ResourceType;
import com.cloudmanagerpro.model.enums.WasteState;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.cloudwatch.CloudWatchClient;
import software.amazon.awssdk.services.cloudwatch.model.Datapoint;
import software.amazon.awssdk.services.cloudwatch.model.Dimension;
import software.amazon.awssdk.services.cloudwatch.model.GetMetricStatisticsRequest;
import software.amazon.awssdk.services.cloudwatch.model.GetMetricStatisticsResponse;
import software.amazon.awssdk.services.cloudwatch.model.Statistic;
import software.amazon.awssdk.services.costexplorer.CostExplorerClient;
import software.amazon.awssdk.services.costexplorer.model.DateInterval;
import software.amazon.awssdk.services.costexplorer.model.GetCostAndUsageRequest;
import software.amazon.awssdk.services.costexplorer.model.GetCostAndUsageResponse;
import software.amazon.awssdk.services.costexplorer.model.Granularity;
import software.amazon.awssdk.services.costexplorer.model.Group;
import software.amazon.awssdk.services.costexplorer.model.GroupDefinition;
import software.amazon.awssdk.services.costexplorer.model.GroupDefinitionType;
import software.amazon.awssdk.services.costexplorer.model.ResultByTime;
import software.amazon.awssdk.services.ec2.Ec2Client;
import software.amazon.awssdk.services.ec2.model.Address;
import software.amazon.awssdk.services.ec2.model.AttributeValue;
import software.amazon.awssdk.services.ec2.model.CreateTagsRequest;
import software.amazon.awssdk.services.ec2.model.DeleteSnapshotRequest;
import software.amazon.awssdk.services.ec2.model.DeleteVolumeRequest;
import software.amazon.awssdk.services.ec2.model.DescribeInstancesRequest;
import software.amazon.awssdk.services.ec2.model.DescribeSnapshotsRequest;
import software.amazon.awssdk.services.ec2.model.Instance;
import software.amazon.awssdk.services.ec2.model.ModifyInstanceAttributeRequest;
import software.amazon.awssdk.services.ec2.model.RebootInstancesRequest;
import software.amazon.awssdk.services.ec2.model.ReleaseAddressRequest;
import software.amazon.awssdk.services.ec2.model.Reservation;
import software.amazon.awssdk.services.ec2.model.Snapshot;
import software.amazon.awssdk.services.ec2.model.StartInstancesRequest;
import software.amazon.awssdk.services.ec2.model.StopInstancesRequest;
import software.amazon.awssdk.services.ec2.model.Tag;
import software.amazon.awssdk.services.ec2.model.TerminateInstancesRequest;
import software.amazon.awssdk.services.ec2.model.Volume;
import software.amazon.awssdk.services.ec2.waiters.Ec2Waiter;
import software.amazon.awssdk.services.rds.RdsClient;
import software.amazon.awssdk.services.rds.model.DBInstance;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.Bucket;
import software.amazon.awssdk.services.s3.model.GetBucketLocationRequest;
import software.amazon.awssdk.services.sts.StsClient;
import software.amazon.awssdk.services.sts.auth.StsAssumeRoleCredentialsProvider;
import software.amazon.awssdk.services.sts.model.AssumeRoleRequest;
import software.amazon.awssdk.services.sts.model.GetCallerIdentityResponse;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * AWS implementation.
 *
 * <p>Decision model: an account is "real" iff it carries a role ARN or access/secret keys (see
 * {@link #useReal}); this is independent of the global {@code ENABLE_DEMO_DATA} flag. For a real
 * account every read (sync, cost, metrics) hits the real AWS SDK v2 APIs (EC2/S3/RDS/CloudWatch/
 * Cost Explorer/STS) and any failure throws {@link ProviderSyncException} — it is NEVER silently
 * replaced with {@link DemoDataGenerator} output, so a broken connection (bad creds, missing IAM
 * permission, wrong region, network) is visible to the user. Credential-less accounts return demo
 * data so the product stays usable with zero credentials.
 *
 * <p>Read/describe calls are gated only by per-account credentials, never by
 * {@code ENABLE_REAL_CLOUD_ACTIONS} — that flag gates only destructive mutations in
 * {@link #executeAction}.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AwsProviderClient implements CloudProviderClient {

    /** Approximate S3 Standard storage cost per GB-month (us-east-1). */
    private static final double S3_GB_MONTH = 0.023;
    /** Approximate EBS gp3 / RDS gp storage cost per GB-month. */
    private static final double EBS_GB_MONTH = 0.10;
    private static final double RDS_STORAGE_GB_MONTH = 0.115;
    private static final double SNAPSHOT_GB_MONTH = 0.05;

    private final AppProperties properties;
    private final DemoDataGenerator demo;

    @Override
    public Provider provider() {
        return Provider.AWS;
    }

    @Override
    public boolean isRealAccount(CloudAccount account) {
        return useReal(account);
    }

    @Override
    public ConnectionTestResult testConnection(CloudAccount account) {
        if (!useReal(account)) {
            return ConnectionTestResult.ok("Connected (demo mode — no AWS credentials configured)",
                    demoAccountId(account));
        }
        try (StsClient sts = stsClient(account)) {
            GetCallerIdentityResponse identity = sts.getCallerIdentity();
            return ConnectionTestResult.ok("Connected to AWS account " + identity.account(), identity.account());
        } catch (Exception ex) {
            log.warn("AWS testConnection failed for account {}: {}", account.getId(), ex.getMessage());
            return ConnectionTestResult.failure("AWS connection failed: " + safe(ex.getMessage()));
        }
    }

    @Override
    public List<CloudResource> syncResources(CloudAccount account) {
        if (!useReal(account)) {
            return demo.generateResources(account);
        }
        try {
            return syncRealResources(account);
        } catch (ProviderSyncException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("AWS sync failed for real account {}: {}", account.getId(), ex.getMessage());
            throw new ProviderSyncException("AWS sync failed: " + safe(ex.getMessage()), ex);
        }
    }

    @Override
    public List<CostDaily> fetchCostData(CloudAccount account, LocalDate start, LocalDate end) {
        if (!useReal(account)) {
            return demo.generateCostData(account, start, end);
        }
        try {
            return fetchRealCostData(account, start, end);
        } catch (ProviderSyncException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("AWS Cost Explorer failed for real account {}: {}", account.getId(), ex.getMessage());
            throw new ProviderSyncException("AWS Cost Explorer failed: " + safe(ex.getMessage()), ex);
        }
    }

    @Override
    public ResourceMetrics fetchMetrics(CloudAccount account, CloudResource resource) {
        if (!useReal(account)) {
            return demo.metricsFor(resource);
        }
        // Real account: attempt real CloudWatch metrics; on failure return empty (NOT demo) metrics.
        try (CloudWatchClient cw = cloudWatchClient(account)) {
            return cpuMetrics(cw, metricNamespace(resource), metricDimension(resource),
                    resource.getExternalId(), 14);
        } catch (Exception ex) {
            log.debug("AWS metrics failed for {}: {}", resource.getExternalId(), ex.getMessage());
            return new ResourceMetrics(0.0, 0.0, 0.0, 0.0);
        }
    }

    @Override
    public ProviderMode actionMode(CloudAccount account) {
        return (properties.isRealCloudActions() && useReal(account)) ? ProviderMode.REAL : ProviderMode.SIMULATED;
    }

    @Override
    public ActionResult executeAction(CloudAccount account, CloudResource resource, ActionType action,
                                      ActionParams params, boolean dryRun) {
        String descriptor = action + " on " + resource.getResourceType() + " " + resource.getExternalId();
        if (dryRun) {
            return ActionResult.ok("Dry run: would " + descriptor + dryRunDetail(action, params, resource));
        }
        if (!properties.isRealCloudActions() || !useReal(account)) {
            return ActionResult.ok("Simulated " + descriptor + " (real cloud actions disabled)");
        }
        try (Ec2Client ec2 = ec2Client(account)) {
            return performRealAction(ec2, resource, action, params, descriptor);
        } catch (Exception ex) {
            log.warn("AWS action {} failed: {}", descriptor, ex.getMessage());
            return ActionResult.failure("AWS action failed: " + safe(ex.getMessage()));
        }
    }

    // ----- real AWS reads ----------------------------------------------------

    /**
     * Lists EC2 instances, EBS volumes, Elastic IPs, snapshots, RDS instances and S3 buckets. The
     * top-level describe/list calls are permission-gated; any failure propagates so the sync is
     * recorded as FAILED with the AWS error. Per-item enrichment (CloudWatch metrics, S3 region/size)
     * is best-effort and never fails the whole sync.
     */
    private List<CloudResource> syncRealResources(CloudAccount account) {
        List<CloudResource> resources = new ArrayList<>();
        try (Ec2Client ec2 = ec2Client(account);
             CloudWatchClient cw = cloudWatchClient(account);
             RdsClient rds = rdsClient(account);
             S3Client s3 = s3Client(account)) {

            for (Reservation reservation : ec2.describeInstancesPaginator().reservations()) {
                for (Instance instance : reservation.instances()) {
                    resources.add(mapInstance(account, cw, instance));
                }
            }
            for (Volume volume : ec2.describeVolumesPaginator().volumes()) {
                resources.add(mapVolume(account, volume));
            }
            for (Address address : ec2.describeAddresses().addresses()) {
                resources.add(mapAddress(account, address));
            }
            DescribeSnapshotsRequest ownSnapshots = DescribeSnapshotsRequest.builder().ownerIds("self").build();
            for (Snapshot snapshot : ec2.describeSnapshotsPaginator(ownSnapshots).snapshots()) {
                resources.add(mapSnapshot(account, snapshot));
            }
            for (DBInstance dbInstance : rds.describeDBInstancesPaginator().dbInstances()) {
                resources.add(mapDatabase(account, cw, dbInstance));
            }
            for (Bucket bucket : s3.listBuckets().buckets()) {
                resources.add(mapBucket(account, s3, cw, bucket));
            }
        }
        return resources;
    }

    private CloudResource mapInstance(CloudAccount account, CloudWatchClient cw, Instance instance) {
        CloudResource r = newResource(account, ResourceType.EC2_INSTANCE, instance.instanceId());
        r.setName(tagValue(instance.tags(), "Name", instance.instanceId()));
        r.setInstanceType(instance.instanceTypeAsString());
        r.setStatus(instance.state() != null ? instance.state().nameAsString() : "unknown");
        r.setTags(tagMap(instance.tags()));
        r.setMonthlyCost(InstanceCatalog.monthlyCost(instance.instanceTypeAsString()));
        r.getMetadata().put("service", "EC2");
        if (instance.launchTime() != null) {
            r.setLastActivityAt(instance.launchTime().atOffset(ZoneOffset.UTC));
        }
        try {
            ResourceMetrics metrics = cpuMetrics(cw, "AWS/EC2", "InstanceId", instance.instanceId(), 14);
            r.setCpuUtilization(metrics.avgCpu());
            r.setNetworkInBytes(metrics.networkInBytes());
            r.setDiskIoBytes(metrics.diskIoBytes());
        } catch (Exception ex) {
            log.debug("CPU metrics unavailable for {}", instance.instanceId());
        }
        return r;
    }

    private CloudResource mapVolume(CloudAccount account, Volume volume) {
        CloudResource r = newResource(account, ResourceType.EBS_VOLUME, volume.volumeId());
        r.setName(tagValue(volume.tags(), "Name", volume.volumeId()));
        r.setSizeGb(volume.size());
        boolean attached = volume.attachments() != null && !volume.attachments().isEmpty();
        r.setStatus(volume.stateAsString());
        r.getMetadata().put("attached", attached);
        r.getMetadata().put("service", "EBS");
        r.setTags(tagMap(volume.tags()));
        r.setMonthlyCost(BigDecimal.valueOf((volume.size() != null ? volume.size() : 0) * EBS_GB_MONTH));
        if (!attached) {
            r.setWasteState(WasteState.UNATTACHED);
        }
        return r;
    }

    private CloudResource mapAddress(CloudAccount account, Address address) {
        String externalId = address.allocationId() != null ? address.allocationId() : address.publicIp();
        CloudResource r = newResource(account, ResourceType.ELASTIC_IP, externalId);
        boolean associated = StringUtils.hasText(address.associationId());
        r.setName(address.publicIp());
        r.setStatus(associated ? "associated" : "unused");
        r.getMetadata().put("associated", associated);
        r.getMetadata().put("service", "Elastic IP");
        r.setTags(tagMap(address.tags()));
        r.setMonthlyCost(associated ? BigDecimal.ZERO : BigDecimal.valueOf(3.60));
        if (!associated) {
            r.setWasteState(WasteState.UNUSED);
        }
        return r;
    }

    private CloudResource mapSnapshot(CloudAccount account, Snapshot snapshot) {
        CloudResource r = newResource(account, ResourceType.SNAPSHOT, snapshot.snapshotId());
        r.setName(tagValue(snapshot.tags(), "Name", snapshot.snapshotId()));
        r.setSizeGb(snapshot.volumeSize());
        r.setStatus(snapshot.stateAsString());
        r.setTags(tagMap(snapshot.tags()));
        r.getMetadata().put("service", "Snapshot");
        r.setMonthlyCost(BigDecimal.valueOf((snapshot.volumeSize() != null ? snapshot.volumeSize() : 0) * SNAPSHOT_GB_MONTH));
        if (snapshot.startTime() != null) {
            long ageDays = ChronoUnit.DAYS.between(snapshot.startTime(), Instant.now());
            r.getMetadata().put("ageDays", ageDays);
            r.setLastActivityAt(snapshot.startTime().atOffset(ZoneOffset.UTC));
            if (ageDays > 90) {
                r.setWasteState(WasteState.OLD_SNAPSHOT);
            }
        }
        return r;
    }

    private CloudResource mapDatabase(CloudAccount account, CloudWatchClient cw, DBInstance db) {
        CloudResource r = newResource(account, ResourceType.RDS_INSTANCE, db.dbInstanceIdentifier());
        r.setName(db.dbInstanceIdentifier());
        r.setInstanceType(db.dbInstanceClass());
        r.setStatus(db.dbInstanceStatus());
        Integer storage = db.allocatedStorage();
        r.setSizeGb(storage);
        BigDecimal instanceCost = InstanceCatalog.monthlyCost(db.dbInstanceClass());
        BigDecimal storageCost = BigDecimal.valueOf((storage != null ? storage : 0) * RDS_STORAGE_GB_MONTH);
        r.setMonthlyCost(instanceCost.add(storageCost));
        r.getMetadata().put("service", "RDS");
        r.getMetadata().put("engine", db.engine());
        r.getMetadata().put("multiAz", Boolean.TRUE.equals(db.multiAZ()));
        if (db.instanceCreateTime() != null) {
            r.setLastActivityAt(db.instanceCreateTime().atOffset(ZoneOffset.UTC));
        }
        try {
            ResourceMetrics metrics = cpuMetrics(cw, "AWS/RDS", "DBInstanceIdentifier",
                    db.dbInstanceIdentifier(), 14);
            r.setCpuUtilization(metrics.avgCpu());
        } catch (Exception ex) {
            log.debug("RDS metrics unavailable for {}", db.dbInstanceIdentifier());
        }
        return r;
    }

    private CloudResource mapBucket(CloudAccount account, S3Client s3, CloudWatchClient cw, Bucket bucket) {
        CloudResource r = newResource(account, ResourceType.S3_BUCKET, bucket.name());
        r.setName(bucket.name());
        r.setStatus("available");
        r.setRegion(bucketRegion(s3, bucket.name(), account));
        r.getMetadata().put("service", "S3");
        if (bucket.creationDate() != null) {
            r.setLastActivityAt(bucket.creationDate().atOffset(ZoneOffset.UTC));
        }
        // Best-effort: size + storage cost from the daily AWS/S3 BucketSizeBytes metric.
        try {
            long bytes = bucketSizeBytes(cw, bucket.name());
            if (bytes > 0) {
                int gb = (int) Math.max(1, Math.ceil(bytes / (1024.0 * 1024.0 * 1024.0)));
                r.setSizeGb(gb);
                r.setMonthlyCost(BigDecimal.valueOf(gb * S3_GB_MONTH).setScale(2, RoundingMode.HALF_UP));
                r.getMetadata().put("sizeBytes", bytes);
            }
        } catch (Exception ex) {
            log.debug("S3 size metric unavailable for {}", bucket.name());
        }
        return r;
    }

    private List<CostDaily> fetchRealCostData(CloudAccount account, LocalDate start, LocalDate end) {
        List<CostDaily> rows = new ArrayList<>();
        try (CostExplorerClient ce = costExplorerClient(account)) {
            GetCostAndUsageRequest request = GetCostAndUsageRequest.builder()
                    .timePeriod(DateInterval.builder()
                            .start(start.toString())
                            .end(end.plusDays(1).toString())
                            .build())
                    .granularity(Granularity.DAILY)
                    .metrics("UnblendedCost")
                    .groupBy(GroupDefinition.builder()
                            .type(GroupDefinitionType.DIMENSION)
                            .key("SERVICE")
                            .build())
                    .build();
            GetCostAndUsageResponse response = ce.getCostAndUsage(request);
            for (ResultByTime result : response.resultsByTime()) {
                LocalDate date = LocalDate.parse(result.timePeriod().start());
                for (Group group : result.groups()) {
                    String service = group.keys().isEmpty() ? "Other" : group.keys().get(0);
                    String amount = group.metrics().get("UnblendedCost").amount();
                    BigDecimal value = new BigDecimal(amount);
                    if (value.signum() <= 0) {
                        continue;
                    }
                    CostDaily row = new CostDaily();
                    row.setProvider(Provider.AWS);
                    row.setUsageDate(date);
                    row.setService(service);
                    row.setAmount(value);
                    row.setCurrency("USD");
                    rows.add(row);
                }
            }
        }
        return rows;
    }

    // ----- real AWS mutations ------------------------------------------------

    private ActionResult performRealAction(Ec2Client ec2, CloudResource resource, ActionType action,
                                           ActionParams params, String descriptor) {
        String id = resource.getExternalId();
        if (isInstanceLifecycle(action) && resource.getResourceType() != ResourceType.EC2_INSTANCE) {
            return ActionResult.failure(action + " is not yet supported for " + resource.getResourceType()
                    + " via real cloud actions (Phase 2)");
        }
        switch (action) {
            case START -> ec2.startInstances(StartInstancesRequest.builder().instanceIds(id).build());
            case STOP -> ec2.stopInstances(StopInstancesRequest.builder().instanceIds(id).build());
            case RESTART -> ec2.rebootInstances(RebootInstancesRequest.builder().instanceIds(id).build());
            case TERMINATE -> ec2.terminateInstances(TerminateInstancesRequest.builder().instanceIds(id).build());
            case DELETE_VOLUME -> ec2.deleteVolume(DeleteVolumeRequest.builder().volumeId(id).build());
            case RELEASE_EIP -> ec2.releaseAddress(ReleaseAddressRequest.builder().allocationId(id).build());
            case DELETE_SNAPSHOT -> ec2.deleteSnapshot(DeleteSnapshotRequest.builder().snapshotId(id).build());
            case RESIZE -> {
                return performResize(ec2, id, params, descriptor);
            }
            case ADD_TAGS -> {
                return performAddTags(ec2, id, params, descriptor);
            }
            default -> {
                return ActionResult.ok("Simulated " + descriptor + " (unsupported real action)");
            }
        }
        return ActionResult.ok("Executed " + descriptor);
    }

    /** Resize requires the instance to be stopped: stop -&gt; wait -&gt; modifyInstanceAttribute -&gt; start. */
    private ActionResult performResize(Ec2Client ec2, String id, ActionParams params, String descriptor) {
        String instanceType = params != null ? params.instanceType() : null;
        if (!StringUtils.hasText(instanceType)) {
            return ActionResult.failure("RESIZE requires a target instanceType");
        }
        DescribeInstancesRequest describe = DescribeInstancesRequest.builder().instanceIds(id).build();
        ec2.stopInstances(StopInstancesRequest.builder().instanceIds(id).build());
        try (Ec2Waiter waiter = ec2.waiter()) {
            waiter.waitUntilInstanceStopped(describe);
        }
        ec2.modifyInstanceAttribute(ModifyInstanceAttributeRequest.builder()
                .instanceId(id)
                .instanceType(AttributeValue.builder().value(instanceType).build())
                .build());
        ec2.startInstances(StartInstancesRequest.builder().instanceIds(id).build());
        return ActionResult.ok("Executed " + descriptor + " to " + instanceType);
    }

    private ActionResult performAddTags(Ec2Client ec2, String id, ActionParams params, String descriptor) {
        Map<String, String> tags = params != null ? params.tags() : Map.of();
        if (tags == null || tags.isEmpty()) {
            return ActionResult.failure("ADD_TAGS requires at least one tag");
        }
        List<Tag> awsTags = tags.entrySet().stream()
                .map(e -> Tag.builder().key(e.getKey()).value(e.getValue()).build())
                .toList();
        ec2.createTags(CreateTagsRequest.builder().resources(id).tags(awsTags).build());
        return ActionResult.ok("Executed " + descriptor + " (" + tags.size() + " tag(s))");
    }

    private boolean isInstanceLifecycle(ActionType action) {
        return action == ActionType.START || action == ActionType.STOP || action == ActionType.RESTART
                || action == ActionType.RESIZE || action == ActionType.TERMINATE;
    }

    private String dryRunDetail(ActionType action, ActionParams params, CloudResource resource) {
        if (action == ActionType.RESIZE && params != null && StringUtils.hasText(params.instanceType())) {
            String from = StringUtils.hasText(resource.getInstanceType()) ? resource.getInstanceType() : "current type";
            return " from " + from + " to " + params.instanceType();
        }
        if (action == ActionType.ADD_TAGS && params != null && params.tags() != null && !params.tags().isEmpty()) {
            return " (" + params.tags().size() + " tag(s))";
        }
        return "";
    }

    // ----- CloudWatch helpers ------------------------------------------------

    private ResourceMetrics cpuMetrics(CloudWatchClient cw, String namespace, String dimensionName,
                                       String dimensionValue, int days) {
        Instant end = Instant.now();
        Instant start = end.minus(Duration.ofDays(days));
        GetMetricStatisticsRequest request = GetMetricStatisticsRequest.builder()
                .namespace(namespace)
                .metricName("CPUUtilization")
                .dimensions(Dimension.builder().name(dimensionName).value(dimensionValue).build())
                .startTime(start)
                .endTime(end)
                .period(3600)
                .statistics(Statistic.AVERAGE, Statistic.MAXIMUM)
                .build();
        GetMetricStatisticsResponse response = cw.getMetricStatistics(request);
        double avg = response.datapoints().stream()
                .map(Datapoint::average).filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue).average().orElse(0.0);
        double max = response.datapoints().stream()
                .map(Datapoint::maximum).filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue).max().orElse(0.0);
        return new ResourceMetrics(avg, max, 0.0, 0.0);
    }

    private long bucketSizeBytes(CloudWatchClient cw, String bucketName) {
        Instant end = Instant.now();
        Instant start = end.minus(Duration.ofDays(3));
        GetMetricStatisticsRequest request = GetMetricStatisticsRequest.builder()
                .namespace("AWS/S3")
                .metricName("BucketSizeBytes")
                .dimensions(
                        Dimension.builder().name("BucketName").value(bucketName).build(),
                        Dimension.builder().name("StorageType").value("StandardStorage").build())
                .startTime(start)
                .endTime(end)
                .period(86400)
                .statistics(Statistic.AVERAGE)
                .build();
        GetMetricStatisticsResponse response = cw.getMetricStatistics(request);
        return (long) response.datapoints().stream()
                .map(Datapoint::average).filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue).max().orElse(0.0);
    }

    private String metricNamespace(CloudResource resource) {
        return resource.getResourceType() == ResourceType.RDS_INSTANCE ? "AWS/RDS" : "AWS/EC2";
    }

    private String metricDimension(CloudResource resource) {
        return resource.getResourceType() == ResourceType.RDS_INSTANCE ? "DBInstanceIdentifier" : "InstanceId";
    }

    private String bucketRegion(S3Client s3, String bucketName, CloudAccount account) {
        try {
            String location = s3.getBucketLocation(GetBucketLocationRequest.builder().bucket(bucketName).build())
                    .locationConstraintAsString();
            // us-east-1 is returned as null/empty by S3.
            return StringUtils.hasText(location) ? location : "us-east-1";
        } catch (Exception ex) {
            log.debug("S3 getBucketLocation failed for {}: {}", bucketName, ex.getMessage());
            return account.getDefaultRegion() != null ? account.getDefaultRegion() : properties.getAws().getDefaultRegion();
        }
    }

    // ----- client builders ---------------------------------------------------

    private Ec2Client ec2Client(CloudAccount account) {
        return Ec2Client.builder().region(region(account)).credentialsProvider(credentials(account)).build();
    }

    private CloudWatchClient cloudWatchClient(CloudAccount account) {
        return CloudWatchClient.builder().region(region(account)).credentialsProvider(credentials(account)).build();
    }

    private RdsClient rdsClient(CloudAccount account) {
        return RdsClient.builder().region(region(account)).credentialsProvider(credentials(account)).build();
    }

    private S3Client s3Client(CloudAccount account) {
        return S3Client.builder().region(region(account)).credentialsProvider(credentials(account)).build();
    }

    private CostExplorerClient costExplorerClient(CloudAccount account) {
        return CostExplorerClient.builder().region(Region.US_EAST_1).credentialsProvider(credentials(account)).build();
    }

    private StsClient stsClient(CloudAccount account) {
        return StsClient.builder().region(region(account)).credentialsProvider(baseCredentials(account)).build();
    }

    private AwsCredentialsProvider credentials(CloudAccount account) {
        if (StringUtils.hasText(account.getRoleArn())) {
            StsClient sts = StsClient.builder()
                    .region(region(account))
                    .credentialsProvider(baseCredentials(account))
                    .build();
            AssumeRoleRequest.Builder assume = AssumeRoleRequest.builder()
                    .roleArn(account.getRoleArn())
                    .roleSessionName("cloudmanagerpro-" + UUID.randomUUID());
            if (StringUtils.hasText(account.getExternalId())) {
                assume.externalId(account.getExternalId());
            }
            return StsAssumeRoleCredentialsProvider.builder()
                    .stsClient(sts)
                    .refreshRequest(assume.build())
                    .build();
        }
        return baseCredentials(account);
    }

    private AwsCredentialsProvider baseCredentials(CloudAccount account) {
        if (StringUtils.hasText(account.getEncryptedAccessKey()) && StringUtils.hasText(account.getEncryptedSecretKey())) {
            return StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(account.getEncryptedAccessKey(), account.getEncryptedSecretKey()));
        }
        return DefaultCredentialsProvider.create();
    }

    private Region region(CloudAccount account) {
        String region = StringUtils.hasText(account.getDefaultRegion())
                ? account.getDefaultRegion()
                : properties.getAws().getDefaultRegion();
        return Region.of(region);
    }

    /**
     * An AWS account is "real" iff it carries an assumable role ARN or static access/secret keys.
     * This is deliberately INDEPENDENT of the global {@code ENABLE_DEMO_DATA} flag: per-account
     * credentials always take precedence, so a credentialed account always syncs real data even when
     * demo mode is on (demo mode then only governs seeding + credential-less fallback).
     */
    private boolean useReal(CloudAccount account) {
        return StringUtils.hasText(account.getRoleArn())
                || (StringUtils.hasText(account.getEncryptedAccessKey())
                && StringUtils.hasText(account.getEncryptedSecretKey()));
    }

    // ----- helpers -----------------------------------------------------------

    private CloudResource newResource(CloudAccount account, ResourceType type, String externalId) {
        CloudResource r = new CloudResource();
        r.setProvider(Provider.AWS);
        r.setResourceType(type);
        r.setExternalId(externalId);
        r.setRegion(account.getDefaultRegion() != null ? account.getDefaultRegion() : properties.getAws().getDefaultRegion());
        r.setWasteState(WasteState.NONE);
        r.setMonthlyCost(BigDecimal.ZERO);
        r.setTags(new HashMap<>());
        return r;
    }

    private Map<String, String> tagMap(List<Tag> tags) {
        Map<String, String> map = new HashMap<>();
        if (tags != null) {
            for (Tag tag : tags) {
                map.put(tag.key(), tag.value());
            }
        }
        return map;
    }

    private String tagValue(List<Tag> tags, String key, String fallback) {
        if (tags != null) {
            for (Tag tag : tags) {
                if (key.equals(tag.key())) {
                    return tag.value();
                }
            }
        }
        return fallback;
    }

    private String demoAccountId(CloudAccount account) {
        long token = account.getId() != null ? Math.abs(account.getId().getMostSignificantBits()) : 100000000000L;
        return String.valueOf(100000000000L + (token % 899999999999L));
    }

    private String safe(String message) {
        return message == null ? "unknown error" : message.replaceAll("[A-Za-z0-9/+]{20,}", "***");
    }
}
