package com.cloudmanagerpro.controller;

import com.cloudmanagerpro.dto.actions.RecommendationUpdateDto;
import com.cloudmanagerpro.dto.actions.SnoozeRequest;
import com.cloudmanagerpro.security.CurrentUser;
import com.cloudmanagerpro.service.actions.RecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Snooze / dismiss across recommendation engines. {@code type} is one of {@code idle},
 * {@code rightsizing}, {@code cleanup}.
 */
@RestController
@RequestMapping("/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;
    private final CurrentUser currentUser;

    @PostMapping("/{type}/{id}/snooze")
    public RecommendationUpdateDto snooze(@PathVariable String type, @PathVariable UUID id,
                                          @RequestBody(required = false) SnoozeRequest request) {
        return recommendationService.snooze(currentUser.id(), type, id, request);
    }

    @PostMapping("/{type}/{id}/dismiss")
    public RecommendationUpdateDto dismiss(@PathVariable String type, @PathVariable UUID id) {
        return recommendationService.dismiss(currentUser.id(), type, id);
    }
}
