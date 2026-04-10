import React from "react";
import { SafeAreaView, ScrollView, Text, View } from "react-native";
import { Card } from "../components/Card";
import { StatCard } from "../components/StatCard";
import { commonStyles } from "../styles/common";
import { ThemeColors } from "../styles/theme";
import { AnalyticsSummary } from "../types";

function formatCents(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toFixed(2)}`;
}

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

        <View style={{ flexDirection: "row", gap: 12 }}>
          <StatCard
            colors={colors}
            label="Saved Total"
            value={formatCents(analytics?.total_saved_cents ?? 0)}
            valueColor={colors.success}
          />
          <StatCard
            colors={colors}
            label="Expenses Total"
            value={formatCents(analytics?.total_expenses_cents ?? 0)}
            valueColor={colors.danger}
          />
        </View>

        <Card colors={colors}>
          <Text style={[commonStyles.sectionTitle, { color: colors.text }]}>Category Breakdown</Text>
          {analytics?.category_breakdown.map((item) => (
            <View
              key={item.category_id}
              style={{
                borderTopWidth: 1,
                borderTopColor: colors.border,
                paddingTop: 12,
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ color: colors.text }}>{item.category_name}</Text>
              <Text style={{ color: colors.text, fontWeight: "700" }}>
                {formatCents(item.amount_cents)}
              </Text>
            </View>
          ))}
        </Card>

        <Card colors={colors}>
          <Text style={[commonStyles.sectionTitle, { color: colors.text }]}>Monthly Trend</Text>
          {analytics?.monthly_trend.map((point) => (
            <View
              key={point.label}
              style={{
                borderTopWidth: 1,
                borderTopColor: colors.border,
                paddingTop: 12,
                gap: 4,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "600" }}>{point.label}</Text>
              <Text style={{ color: colors.subtext }}>Income: {formatCents(point.income_cents)}</Text>
              <Text style={{ color: colors.subtext }}>Expense: {formatCents(point.expense_cents)}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}