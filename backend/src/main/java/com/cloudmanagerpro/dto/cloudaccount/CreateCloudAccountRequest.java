package com.cloudmanagerpro.dto.cloudaccount;

import com.cloudmanagerpro.model.enums.Provider;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateCloudAccountRequest(
        @NotBlank @Size(max = 120) String name,
        @NotNull Provider provider,
        String accessKeyId,
        String secretAccessKey,
        String roleArn,
        String externalId,
        String defaultRegion
) {
}
