import React from "react";
import { SafeAreaView, ScrollView, Text, View } from "react-native";
import { Card } from "../components/Card";
import { StatCard } from "../components/StatCard";
import { SectionHeader } from "../components/SectionHeader";
import { CategoryBreakdownChart } from "../components/CategoryBreakdownChart";
import { TrendBarChart } from "../components/TrendBarChart";
import { commonStyles } from "../styles/common";
import { ThemeColors } from "../styles/theme";
import { AnalyticsSummary } from "../types";
import { formatCents } from "../lib/format";

export function AnalyticsScreen({
  colors,
  analytics,
}: {
  colors: ThemeColors;
  analytics: AnalyticsSummary | null;
}) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={commonStyles.screenContent}>
        <Text style={[commonStyles.title, { color: colors.text }]}>Analytics</Text>

        <View style={commonStyles.twoColRow}>
          <StatCard
            colors={colors}
            label="Saved Total"
            value={formatCents(analytics?.total_saved_cents ?? 0)}
            valueColor={colors.success}
          />
          <StatCard
            colors={colors}
            label="Expense Total"
            value={formatCents(analytics?.total_expenses_cents ?? 0)}
            valueColor={colors.danger}
          />
        </View>

        <Card colors={colors}>
          <SectionHeader
            title="Category Breakdown"
            subtitle="Where your spending is going"
            colors={colors}
          />
          <CategoryBreakdownChart
            colors={colors}
            items={analytics?.category_breakdown ?? []}
          />
        </Card>

        <Card colors={colors}>
          <SectionHeader
            title="Monthly Trend"
            subtitle="Income vs expense over time"
            colors={colors}
          />
          <TrendBarChart
            colors={colors}
            items={analytics?.monthly_trend ?? []}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}