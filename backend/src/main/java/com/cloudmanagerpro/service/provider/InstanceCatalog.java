package com.cloudmanagerpro.service.provider;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Static catalog of representative instance types, their approximate on-demand monthly cost and the
 * per-family size ladders used both by demo generation and the rightsizing engine (one/two tiers down).
 */
public final class InstanceCatalog {

    private static final List<List<String>> FAMILIES = List.of(
            List.of("t3.nano", "t3.micro", "t3.small", "t3.medium", "t3.large", "t3.xlarge", "t3.2xlarge"),
            List.of("m5.large", "m5.xlarge", "m5.2xlarge", "m5.4xlarge"),
            List.of("c5.large", "c5.xlarge", "c5.2xlarge", "c5.4xlarge"),
            List.of("r5.large", "r5.xlarge", "r5.2xlarge"),
            List.of("db.t3.small", "db.t3.medium", "db.t3.large", "db.r5.large", "db.r5.xlarge")
    );

    private static final Map<String, BigDecimal> MONTHLY_COST = Map.ofEntries(
            Map.entry("t3.nano", bd("3.80")),
            Map.entry("t3.micro", bd("7.59")),
            Map.entry("t3.small", bd("15.18")),
            Map.entry("t3.medium", bd("30.37")),
            Map.entry("t3.large", bd("60.74")),
            Map.entry("t3.xlarge", bd("121.47")),
            Map.entry("t3.2xlarge", bd("242.94")),
            Map.entry("m5.large", bd("70.08")),
            Map.entry("m5.xlarge", bd("140.16")),
            Map.entry("m5.2xlarge", bd("280.32")),
            Map.entry("m5.4xlarge", bd("560.64")),
            Map.entry("c5.large", bd("62.05")),
            Map.entry("c5.xlarge", bd("124.10")),
            Map.entry("c5.2xlarge", bd("248.20")),
            Map.entry("c5.4xlarge", bd("496.40")),
            Map.entry("r5.large", bd("91.98")),
            Map.entry("r5.xlarge", bd("183.96")),
            Map.entry("r5.2xlarge", bd("367.92")),
            Map.entry("db.t3.small", bd("29.00")),
            Map.entry("db.t3.medium", bd("58.40")),
            Map.entry("db.t3.large", bd("116.80")),
            Map.entry("db.r5.large", bd("182.00")),
            Map.entry("db.r5.xlarge", bd("364.00"))
    );

    private InstanceCatalog() {
    }

    private static BigDecimal bd(String v) {
        return new BigDecimal(v);
    }

    public static BigDecimal monthlyCost(String type) {
        return MONTHLY_COST.getOrDefault(type, bd("50.00"));
    }

    /** Returns the type {@code steps} tiers smaller within its family, or the smallest available. */
    public static String smaller(String type, int steps) {
        for (List<String> family : FAMILIES) {
            int idx = family.indexOf(type);
            if (idx >= 0) {
                int target = Math.max(0, idx - steps);
                return family.get(target);
            }
        }
        return type;
    }

    public static boolean isKnown(String type) {
        return type != null && MONTHLY_COST.containsKey(type);
    }
}
