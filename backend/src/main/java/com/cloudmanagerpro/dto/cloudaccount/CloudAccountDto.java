package com.cloudmanagerpro.dto.cloudaccount;

import com.cloudmanagerpro.model.CloudAccount;
import com.cloudmanagerpro.model.enums.ConnectionStatus;
import com.cloudmanagerpro.model.enums.Provider;
import com.cloudmanagerpro.model.enums.SyncStatus;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Cloud account projection that NEVER exposes decrypted secrets (access key masked, secret omitted). */
public record CloudAccountDto(
        UUID id,
        String name,
        Provider provider,
        ConnectionStatus connectionStatus,
        String defaultRegion,
        String accountIdentifier,
        String maskedAccessKey,
        boolean hasCredentials,
        boolean hasRoleArn,
        String roleArn,
        OffsetDateTime lastSyncAt,
        SyncStatus lastSyncStatus,
        String lastError,
        int resourceCount,
        BigDecimal monthlyCost,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public static CloudAccountDto from(CloudAccount account) {
        boolean hasCredentials = StringUtils.hasText(account.getEncryptedAccessKey())
                && StringUtils.hasText(account.getEncryptedSecretKey());
        return new CloudAccountDto(
                account.getId(),
                account.getName(),
                account.getProvider(),
                account.getConnectionStatus(),
                account.getDefaultRegion(),
                account.getAccountIdentifier(),
                mask(account.getEncryptedAccessKey()),
                hasCredentials,
                StringUtils.hasText(account.getRoleArn()),
                account.getRoleArn(),
                account.getLastSyncAt(),
                account.getLastSyncStatus(),
                account.getLastError(),
                account.getResourceCount(),
                account.getMonthlyCost(),
                account.getCreatedAt(),
                account.getUpdatedAt());
    }

    private static String mask(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.length() <= 4) {
            return "****";
        }
        return "****" + trimmed.substring(trimmed.length() - 4);
    }
}
