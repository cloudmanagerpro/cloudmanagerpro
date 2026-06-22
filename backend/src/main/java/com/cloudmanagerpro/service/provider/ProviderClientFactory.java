package com.cloudmanagerpro.service.provider;

import com.cloudmanagerpro.exception.BadRequestException;
import com.cloudmanagerpro.model.enums.Provider;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/** Resolves the {@link CloudProviderClient} for a given {@link Provider}. */
@Component
public class ProviderClientFactory {

    private final Map<Provider, CloudProviderClient> clients = new EnumMap<>(Provider.class);

    public ProviderClientFactory(List<CloudProviderClient> providerClients) {
        for (CloudProviderClient client : providerClients) {
            clients.put(client.provider(), client);
        }
    }

    public CloudProviderClient forProvider(Provider provider) {
        CloudProviderClient client = clients.get(provider);
        if (client == null) {
            throw new BadRequestException("Unsupported provider: " + provider);
        }
        return client;
    }
}
