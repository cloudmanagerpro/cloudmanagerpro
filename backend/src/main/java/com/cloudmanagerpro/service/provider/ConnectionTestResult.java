package com.cloudmanagerpro.service.provider;

public record ConnectionTestResult(
        boolean success,
        String message,
        String accountIdentifier
) {
    public static ConnectionTestResult ok(String message, String accountIdentifier) {
        return new ConnectionTestResult(true, message, accountIdentifier);
    }

    public static ConnectionTestResult failure(String message) {
        return new ConnectionTestResult(false, message, null);
    }
}
