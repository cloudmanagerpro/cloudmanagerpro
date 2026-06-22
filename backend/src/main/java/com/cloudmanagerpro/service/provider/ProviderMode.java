package com.cloudmanagerpro.service.provider;

/**
 * Whether a provider will perform a real mutation for a given account, or only simulate it.
 * Surfaced to the API ({@code providerMode}) so the frontend can clearly label simulated results.
 */
public enum ProviderMode {
    REAL,
    SIMULATED
}
