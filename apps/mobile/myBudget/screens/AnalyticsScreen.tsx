import React from "react";
import { SafeAreaView, ScrollView, Text, View } from "react-native";
import { Card } from "../components/Card";
import { SectionHeader } from "../components/SectionHeader";
import { StatCard } from "../components/StatCard";
import { commonStyles } from "../styles/common";
import { ThemeColors } from "../styles/theme";
import { AnalyticsSummary } from "../types";
import { SimpleBarChart } from "../components/SimpleBarChart";

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
        <View style={{ gap: 6 }}>
          <Text style={[commonStyles.eyebrow, { color: colors.textMuted }]}>Insights</Text>
          <Text style={[commonStyles.title, { color: colors.text }]}>Analytics</Text>
          <Text style={{ color: colors.textMuted, fontSize: 15 }}>
            A cleaner view of how your money is moving
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <StatCard
            colors={colors}
            label="Saved total"
            value={formatCents(analytics?.total_saved_cents ?? 0)}
            valueColor={colors.success}
            elevated
          />
          <StatCard
            colors={colors}
            label="Expense total"
            value={formatCents(analytics?.total_expenses_cents ?? 0)}
            valueColor={colors.danger}
            elevated
          />
        </View>

        <Card colors={colors} elevated>
          <SectionHeader
            colors={colors}
            title="Income vs spending"
            subtitle="High-level totals across your tracked data"
          />

          <View style={{ gap: 14 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.textSoft, fontSize: 15 }}>Income</Text>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
                {formatCents(analytics?.total_income_cents ?? 0)}
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.textSoft, fontSize: 15 }}>Expenses</Text>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
                {formatCents(analytics?.total_expenses_cents ?? 0)}
              </Text>
            </View>

            <View
              style={{
                height: 10,
                backgroundColor: colors.bgSecondary,
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width:
                    analytics && analytics.total_income_cents > 0
                      ? `${Math.min(
                          100,
                          (analytics.total_expenses_cents * 100) / analytics.total_income_cents
                        )}%`
                      : "0%",
                  height: "100%",
                  backgroundColor: colors.accent,
                  borderRadius: 999,
                }}
              />
            </View>
          </View>
        </Card>

        <SimpleBarChart
          colors={colors}
          data={
            analytics?.category_breakdown.slice(0, 6).map((item) => ({
              label: item.category_name,
              value: item.amount_cents,
              color: item.color,
            })) ?? []
          }
        />

        <Card colors={colors}>
          <SectionHeader
            colors={colors}
            title="Monthly trend"
            subtitle="Recent income and expense activity"
          />

          <View style={{ gap: 14 }}>
            {analytics?.monthly_trend.map((point) => (
              <View
                key={point.label}
                style={{
                  paddingVertical: 4,
                  gap: 6,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: "600", fontSize: 15 }}>
                  {point.label}
                </Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: colors.textMuted }}>Income</Text>
                  <Text style={{ color: colors.textSoft, fontWeight: "600" }}>
                    {formatCents(point.income_cents)}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: colors.textMuted }}>Expenses</Text>
                  <Text style={{ color: colors.textSoft, fontWeight: "600" }}>
                    {formatCents(point.expense_cents)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}