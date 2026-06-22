package com.cloudmanagerpro.service;

import com.cloudmanagerpro.model.User;

/**
 * Hook implemented by the demo subsystem to populate a brand-new tenant with realistic
 * accounts/resources/costs so the dashboard is never empty in demo mode. Injected as an
 * optional dependency so auth works even if demo data is disabled.
 */
public interface DemoSeeder {

    void seedForNewUser(User user);
}
