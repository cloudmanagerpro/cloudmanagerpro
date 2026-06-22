package com.cloudmanagerpro.service.cost;

import com.cloudmanagerpro.dto.cost.CostPointDto;
import com.cloudmanagerpro.dto.cost.CostSummaryDto;
import com.cloudmanagerpro.dto.cost.KeyAmountDto;
import com.cloudmanagerpro.dto.cost.SavingsOpportunityDto;
import com.cloudmanagerpro.model.CleanupCandidate;
import com.cloudmanagerpro.model.CloudAccount;
import com.cloudmanagerpro.model.CostDaily;
import com.cloudmanagerpro.model.RightsizingRecommendation;
import com.cloudmanagerpro.model.enums.CleanupStatus;
import com.cloudmanagerpro.model.enums.CleanupType;
import com.cloudmanagerpro.repository.CleanupCandidateRepository;
import com.cloudmanagerpro.repository.CostDailyRepository;
import com.cloudmanagerpro.repository.RightsizingRecommendationRepository;
import com.cloudmanagerpro.service.provider.ProviderClientFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CostService {

    private final CostDailyRepository costDailyRepository;
    private final CleanupCandidateRepository cleanupCandidateRepository;
    private final RightsizingRecommendationRepository rightsizingRecommendationRepository;
    private final ProviderClientFactory providerClientFactory;

    // ----- ingestion ---------------------------------------------------------

    /**
     * Replaces the account's cost history with a fresh {@code days}-day window. The provider fetch
     * happens BEFORE the delete so a real Cost Explorer failure (which throws) leaves the existing
     * rows untouched instead of wiping them; for a real account this also clears any stale demo cost
     * rows previously attributed to the account and replaces them with real costs.
     */
    @Transactional
    public void ingestHistorical(CloudAccount account, int days) {
        LocalDate end = LocalDate.now();
        LocalDate start = end.minusDays(Math.max(1, days) - 1L);
        List<CostDaily> rows = providerClientFactory.forProvider(account.getProvider())
                .fetchCostData(account, start, end);
        for (CostDaily row : rows) {
            row.setUserId(account.getUserId());
            row.setCloudAccountId(account.getId());
        }
        costDailyRepository.deleteByCloudAccountId(account.getId());
        costDailyRepository.saveAll(rows);
    }

    @Transactional
    public void ingestDaily(CloudAccount account) {
        LocalDate day = LocalDate.now().minusDays(1);
        List<CostDaily> rows = providerClientFactory.forProvider(account.getProvider())
                .fetchCostData(account, day, day);
        for (CostDaily row : rows) {
            row.setUserId(account.getUserId());
            row.setCloudAccountId(account.getId());
        }
        costDailyRepository.saveAll(rows);
    }

    // ----- queries -----------------------------------------------------------

    @Transactional(readOnly = true)
    public CostSummaryDto summary(UUID userId) {
        LocalDate today = LocalDate.now();
        List<CostDaily> rows = costDailyRepository.findByUserIdAndUsageDateBetween(
                userId, today.minusDays(70), today);

        BigDecimal last30 = sumBetween(rows, today.minusDays(29), today);
        BigDecimal previous30 = sumBetween(rows, today.minusDays(59), today.minusDays(30));
        BigDecimal currentMonthToDate = sumBetween(rows, today.withDayOfMonth(1), today);
        LocalDate firstOfLastMonth = today.withDayOfMonth(1).minusMonths(1);
        LocalDate lastOfLastMonth = today.withDayOfMonth(1).minusDays(1);
        BigDecimal lastMonthTotal = sumBetween(rows, firstOfLastMonth, lastOfLastMonth);

        double changePercent = previous30.signum() > 0
                ? last30.subtract(previous30).divide(previous30, 4, RoundingMode.HALF_UP).doubleValue() * 100.0
                : 0.0;
        BigDecimal dailyAverage = last30.divide(BigDecimal.valueOf(30), 2, RoundingMode.HALF_UP);
        BigDecimal projectedMonthly = dailyAverage.multiply(BigDecimal.valueOf(today.lengthOfMonth()))
                .setScale(2, RoundingMode.HALF_UP);

        List<CostDaily> last30Rows = rows.stream()
                .filter(r -> !r.getUsageDate().isBefore(today.minusDays(29)))
                .toList();
        List<KeyAmountDto> topServices = groupBy(last30Rows, r -> r.getService() != null ? r.getService() : "Other", 6);
        List<KeyAmountDto> byProvider = groupBy(last30Rows, r -> r.getProvider().name(), 10);

        return new CostSummaryDto(
                scale(currentMonthToDate),
                scale(lastMonthTotal),
                scale(last30),
                scale(previous30),
                Math.round(changePercent * 10.0) / 10.0,
                projectedMonthly,
                dailyAverage,
                totalPotentialSavings(userId),
                "USD",
                topServices,
                byProvider);
    }

    @Transactional(readOnly = true)
    public List<CostPointDto> trend(UUID userId, int days) {
        LocalDate today = LocalDate.now();
        LocalDate start = today.minusDays(Math.max(1, days) - 1L);
        List<CostDaily> rows = costDailyRepository.findByUserIdAndUsageDateBetween(userId, start, today);
        Map<LocalDate, BigDecimal> byDate = new TreeMap<>();
        for (LocalDate date = start; !date.isAfter(today); date = date.plusDays(1)) {
            byDate.put(date, BigDecimal.ZERO);
        }
        for (CostDaily row : rows) {
            byDate.merge(row.getUsageDate(), nz(row.getAmount()), BigDecimal::add);
        }
        return byDate.entrySet().stream()
                .map(e -> new CostPointDto(e.getKey(), scale(e.getValue())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<KeyAmountDto> byProvider(UUID userId, int days) {
        return grouped(userId, days, r -> r.getProvider().name());
    }

    @Transactional(readOnly = true)
    public List<KeyAmountDto> byService(UUID userId, int days) {
        return grouped(userId, days, r -> r.getService() != null ? r.getService() : "Other");
    }

    @Transactional(readOnly = true)
    public List<KeyAmountDto> byRegion(UUID userId, int days) {
        return grouped(userId, days, r -> r.getRegion() != null ? r.getRegion() : "unknown");
    }

    @Transactional(readOnly = true)
    public List<SavingsOpportunityDto> savingsOpportunities(UUID userId) {
        List<SavingsOpportunityDto> opportunities = new ArrayList<>();
        List<CleanupCandidate> pending = cleanupCandidateRepository
                .findByUserIdAndStatus(userId, CleanupStatus.PENDING);

        Map<CleanupType, List<CleanupCandidate>> byType = pending.stream()
                .collect(Collectors.groupingBy(CleanupCandidate::getCandidateType));
        for (Map.Entry<CleanupType, List<CleanupCandidate>> entry : byType.entrySet()) {
            BigDecimal savings = entry.getValue().stream()
                    .map(CleanupCandidate::getEstimatedMonthlySavings)
                    .filter(java.util.Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (savings.signum() > 0) {
                opportunities.add(new SavingsOpportunityDto(prettyType(entry.getKey()),
                        entry.getValue().size(), scale(savings)));
            }
        }

        List<RightsizingRecommendation> recommendations = rightsizingRecommendationRepository
                .findByUserIdOrderByEstimatedMonthlySavingsDesc(userId);
        BigDecimal rightsizingSavings = recommendations.stream()
                .map(RightsizingRecommendation::getEstimatedMonthlySavings)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (rightsizingSavings.signum() > 0) {
            opportunities.add(new SavingsOpportunityDto("Rightsizing", recommendations.size(),
                    scale(rightsizingSavings)));
        }

        opportunities.sort(Comparator.comparing(SavingsOpportunityDto::estimatedMonthlySavings).reversed());
        return opportunities;
    }

    @Transactional(readOnly = true)
    public BigDecimal totalPotentialSavings(UUID userId) {
        return savingsOpportunities(userId).stream()
                .map(SavingsOpportunityDto::estimatedMonthlySavings)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // ----- helpers -----------------------------------------------------------

    private List<KeyAmountDto> grouped(UUID userId, int days, java.util.function.Function<CostDaily, String> keyFn) {
        LocalDate today = LocalDate.now();
        LocalDate start = today.minusDays(Math.max(1, days) - 1L);
        List<CostDaily> rows = costDailyRepository.findByUserIdAndUsageDateBetween(userId, start, today);
        return groupBy(rows, keyFn, Integer.MAX_VALUE);
    }

    private List<KeyAmountDto> groupBy(List<CostDaily> rows, java.util.function.Function<CostDaily, String> keyFn,
                                       int limit) {
        Map<String, BigDecimal> totals = new LinkedHashMap<>();
        for (CostDaily row : rows) {
            totals.merge(keyFn.apply(row), nz(row.getAmount()), BigDecimal::add);
        }
        return totals.entrySet().stream()
                .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                .limit(limit)
                .map(e -> new KeyAmountDto(e.getKey(), scale(e.getValue())))
                .toList();
    }

    private BigDecimal sumBetween(List<CostDaily> rows, LocalDate start, LocalDate end) {
        return rows.stream()
                .filter(r -> !r.getUsageDate().isBefore(start) && !r.getUsageDate().isAfter(end))
                .map(r -> nz(r.getAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private String prettyType(CleanupType type) {
        return switch (type) {
            case IDLE_VM -> "Idle instances";
            case STOPPED_VM -> "Stopped instances";
            case UNATTACHED_DISK -> "Unattached disks";
            case UNUSED_EIP -> "Unused IP addresses";
            case OLD_SNAPSHOT -> "Old snapshots";
            case MISSING_TAGS -> "Missing tags";
            case ORPHANED_RESOURCE -> "Orphaned resources";
        };
    }

    private BigDecimal nz(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private BigDecimal scale(BigDecimal value) {
        return nz(value).setScale(2, RoundingMode.HALF_UP);
    }
}
