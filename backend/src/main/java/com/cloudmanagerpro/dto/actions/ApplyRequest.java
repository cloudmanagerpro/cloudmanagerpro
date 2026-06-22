package com.cloudmanagerpro.dto.actions;

/**
 * Optional body for {@code POST /rightsizing/{id}/apply} and {@code POST /idle/{id}/apply}.
 * <ul>
 *   <li>{@code instanceType} – override the recommended target type (rightsizing only).</li>
 *   <li>{@code dryRun} – when true, previews the action instead of executing it.</li>
 *   <li>{@code confirmation} – required for destructive real actions (idle apply that maps to terminate/delete).</li>
 * </ul>
 * The whole body may be omitted, which is equivalent to {@code { "dryRun": false }}.
 */
public record ApplyRequest(
        String instanceType,
        boolean dryRun,
        String confirmation
) {
}
