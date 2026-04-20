import React from "react";
import { SafeAreaView, ScrollView, Text, View } from "react-native";
import { Card } from "../components/Card";
import { CategoryProgressRow } from "../components/CategoryProgressRow";
import { HeroBudgetCard } from "../components/HeroBudgetCard";
import { SectionHeader } from "../components/SectionHeader";
import { StatCard } from "../components/StatCard";
import { commonStyles } from "../styles/common";
import { ThemeColors } from "../styles/theme";
import { HomeSummary } from "../types";

function formatCents(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toFixed(2)}`;
}

export function HomeScreen({
  colors,
  homeSummary,
  onRefresh,
  onClosePeriod,
}: {
  colors: ThemeColors;
  homeSummary: HomeSummary | null;
  onRefresh: () => Promise<void>;
  onClosePeriod: () => Promise<void>;
}) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={commonStyles.screenContent}>
        <View style={{ gap: 6 }}>
          <Text style={[commonStyles.eyebrow, { color: colors.textMuted }]}>
            myBudget
          </Text>
          <Text style={[commonStyles.title, { color: colors.text }]}>
            Overview
          </Text>
        </View>

        <HeroBudgetCard
          colors={colors}
          periodLabel={`${homeSummary?.period_start ?? "--"} - ${homeSummary?.period_end ?? "--"}`}
          trackingCadence={homeSummary?.tracking_cadence ?? "weekly"}
          remainingAmountCents={homeSummary?.remaining_amount_cents ?? 0}
          netIncomeBudgetCents={homeSummary?.net_income_budget_cents ?? 0}
          spentAmountCents={homeSummary?.spent_amount_cents ?? 0}
        />

        <View style={{ flexDirection: "row", gap: 12 }}>
          <StatCard
            colors={colors}
            label="Budget"
            value={formatCents(homeSummary?.net_income_budget_cents ?? 0)}
          />
          <StatCard
            colors={colors}
            label="Spent"
            value={formatCents(homeSummary?.spent_amount_cents ?? 0)}
            valueColor={colors.danger}
          />
        </View>

        <Card colors={colors}>
          <SectionHeader
            colors={colors}
            title="Category progress"
            subtitle="Track where this period is going"
          />

          <View style={{ gap: 8 }}>
            {(homeSummary?.category_progress_items ?? []).map((item) => (
              <CategoryProgressRow
                key={item.category_id}
                colors={colors}
                categoryName={item.category_name}
                categoryColor={item.category_color}
                percentUsed={item.percent_used}
                spentAmountCents={item.spent_amount_cents}
                budgetAmountCents={item.budget_amount_cents}
                remainingAmountCents={item.remaining_amount_cents}
              />
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}