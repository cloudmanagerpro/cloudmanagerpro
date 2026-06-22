package com.cloudmanagerpro.service;

import com.cloudmanagerpro.model.enums.ResourceType;

import java.util.EnumSet;
import java.util.Set;

/** Cross-provider categorisation of resource types used by the analysis engines. */
public final class ResourceTypes {

    public static final Set<ResourceType> COMPUTE = EnumSet.of(
            ResourceType.EC2_INSTANCE, ResourceType.VM, ResourceType.RDS_INSTANCE);

    public static final Set<ResourceType> INSTANCE_COMPUTE = EnumSet.of(
            ResourceType.EC2_INSTANCE, ResourceType.VM);

    public static final Set<ResourceType> RIGHTSIZEABLE = EnumSet.of(
            ResourceType.EC2_INSTANCE, ResourceType.VM, ResourceType.RDS_INSTANCE);

    public static final Set<ResourceType> DISK = EnumSet.of(
            ResourceType.EBS_VOLUME, ResourceType.DISK);

    public static final Set<ResourceType> IP = EnumSet.of(
            ResourceType.ELASTIC_IP, ResourceType.PUBLIC_IP);

    private ResourceTypes() {
    }

    public static boolean isCompute(ResourceType type) {
        return COMPUTE.contains(type);
    }

    public static boolean isInstanceCompute(ResourceType type) {
        return INSTANCE_COMPUTE.contains(type);
    }

    public static boolean isRightsizeable(ResourceType type) {
        return RIGHTSIZEABLE.contains(type);
    }

    public static boolean isDisk(ResourceType type) {
        return DISK.contains(type);
    }

    public static boolean isIp(ResourceType type) {
        return IP.contains(type);
    }

    public static boolean isSnapshot(ResourceType type) {
        return type == ResourceType.SNAPSHOT;
    }
}
