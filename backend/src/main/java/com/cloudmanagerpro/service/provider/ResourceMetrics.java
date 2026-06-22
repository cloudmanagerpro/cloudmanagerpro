package com.cloudmanagerpro.service.provider;

/** Aggregated utilization metrics for a single resource over the analysis lookback window. */
public record ResourceMetrics(
        double avgCpu,
        double maxCpu,
        double networkInBytes,
        double diskIoBytes
) {
}
