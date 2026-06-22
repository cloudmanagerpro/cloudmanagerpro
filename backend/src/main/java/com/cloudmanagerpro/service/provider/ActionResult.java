package com.cloudmanagerpro.service.provider;

public record ActionResult(
        boolean success,
        String message
) {
    public static ActionResult ok(String message) {
        return new ActionResult(true, message);
    }

    public static ActionResult failure(String message) {
        return new ActionResult(false, message);
    }
}
