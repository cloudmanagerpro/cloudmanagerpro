package com.cloudmanagerpro.service;

import com.cloudmanagerpro.dto.resource.ResourceFilter;
import com.cloudmanagerpro.model.CloudResource;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Builds tenant-scoped {@link Specification}s for the resource explorer filters. */
public final class CloudResourceSpecifications {

    private CloudResourceSpecifications() {
    }

    public static Specification<CloudResource> withFilter(UUID userId, ResourceFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("userId"), userId));
            if (filter != null) {
                if (filter.provider() != null) {
                    predicates.add(cb.equal(root.get("provider"), filter.provider()));
                }
                if (filter.resourceType() != null) {
                    predicates.add(cb.equal(root.get("resourceType"), filter.resourceType()));
                }
                if (StringUtils.hasText(filter.region())) {
                    predicates.add(cb.equal(root.get("region"), filter.region()));
                }
                if (StringUtils.hasText(filter.status())) {
                    predicates.add(cb.equal(cb.lower(root.get("status")), filter.status().toLowerCase()));
                }
                if (filter.wasteState() != null) {
                    predicates.add(cb.equal(root.get("wasteState"), filter.wasteState()));
                }
                if (StringUtils.hasText(filter.search())) {
                    String like = "%" + filter.search().toLowerCase() + "%";
                    predicates.add(cb.or(
                            cb.like(cb.lower(root.get("name")), like),
                            cb.like(cb.lower(root.get("externalId")), like)));
                }
                if (filter.minCost() != null) {
                    predicates.add(cb.greaterThanOrEqualTo(root.<BigDecimal>get("monthlyCost"), filter.minCost()));
                }
                if (filter.maxCost() != null) {
                    predicates.add(cb.lessThanOrEqualTo(root.<BigDecimal>get("monthlyCost"), filter.maxCost()));
                }
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
