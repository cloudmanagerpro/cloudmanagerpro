package com.cloudmanagerpro.service.audit;

import com.cloudmanagerpro.model.ActionLog;
import com.cloudmanagerpro.model.CloudResource;
import com.cloudmanagerpro.model.enums.ActionType;
import com.cloudmanagerpro.repository.ActionLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.UUID;

/** Central writer for the immutable {@link ActionLog} audit trail. */
@Service
@RequiredArgsConstructor
public class AuditService {

    private final ActionLogRepository actionLogRepository;

    public ActionLog record(UUID userId, CloudResource resource, ActionType actionType, String action,
                            boolean dryRun, boolean success, String message, BigDecimal savings) {
        ActionLog log = new ActionLog();
        log.setUserId(userId);
        log.setActionType(actionType);
        log.setAction(action);
        log.setDryRun(dryRun);
        log.setSuccess(success);
        log.setResultMessage(message);
        log.setEstimatedSavings(savings != null ? savings : BigDecimal.ZERO);
        if (resource != null) {
            log.setResourceId(resource.getId());
            log.setCloudAccountId(resource.getCloudAccountId());
            log.setResourceType(resource.getResourceType());
            log.setResourceName(resource.getName());
            log.setResourceExternalId(resource.getExternalId());
            log.setProvider(resource.getProvider());
        }
        return actionLogRepository.save(log);
    }
}
