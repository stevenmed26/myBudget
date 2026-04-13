import React from "react";
import { Alert, SafeAreaView, ScrollView, Text, View } from "react-native";
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
          <Text style={[commonStyles.eyebrow, { color: colors.textMuted }]}>myBudget</Text>
          <Text style={[commonStyles.title, { color: colors.text }]}>Overview</Text>
        </View>

        <HeroBudgetCard
          colors={colors}
          periodLabel={`${homeSummary?.period_start} - ${homeSummary?.period_end}`}
          cadenceLabel={homeSummary?.tracking_cadence ?? "weekly"}
          remaining={homeSummary?.remaining_amount_cents ?? 0}
          budget={homeSummary?.net_income_budget_cents ?? 0}
          spent={homeSummary?.spent_amount_cents ?? 0}
          onClosePeriod={async () => {
            try {
              await onClosePeriod();
            } catch (err: any) {
              Alert.alert("Close failed", err?.message ?? "Unknown error");
            }
          }}
          onRefresh={async () => {
            try {
              await onRefresh();
            } catch (err: any) {
              Alert.alert("Refresh failed", err?.message ?? "Unknown error");
            }
          }}
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
            {homeSummary?.category_progress_items.map((item) => (
              <CategoryProgressRow
                key={item.category_id}
                colors={colors}
                name={item.category_name}
                color={item.category_color}
                percentUsed={item.percent_used}
                spent={item.spent_amount_cents}
                budget={item.budget_amount_cents}
                remaining={item.remaining_amount_cents}
              />
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}