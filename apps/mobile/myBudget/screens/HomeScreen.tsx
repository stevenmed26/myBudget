import React from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Card } from "../components/Card";
import { ProgressBar } from "../components/ProgressBar";
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
        <Text style={[commonStyles.title, { color: colors.text }]}>myBudget</Text>

        <Card colors={colors}>
          <Text style={{ color: colors.subtext, fontSize: 13 }}>Current Period</Text>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>
            {homeSummary?.period_start} - {homeSummary?.period_end}
          </Text>
          <Text style={{ color: colors.subtext }}>
            Tracking cadence: {homeSummary?.tracking_cadence}
          </Text>
        </Card>

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
          <Text style={{ color: colors.subtext }}>Remaining</Text>
          <Text
            style={{
              color: (homeSummary?.remaining_amount_cents ?? 0) < 0 ? colors.danger : colors.success,
              fontSize: 26,
              fontWeight: "700",
              marginTop: 6,
            }}
          >
            {formatCents(homeSummary?.remaining_amount_cents ?? 0)}
          </Text>
        </Card>

        <Pressable
          onPress={async () => {
            try {
              await onClosePeriod();
            } catch (err: any) {
              Alert.alert("Close failed", err?.message ?? "Unknown error");
            }
          }}
          style={[commonStyles.button, { backgroundColor: colors.accent }]}
        >
          <Text style={commonStyles.buttonText}>Close Current Period</Text>
        </Pressable>

        <Pressable
          onPress={async () => {
            try {
              await onRefresh();
            } catch (err: any) {
              Alert.alert("Refresh failed", err?.message ?? "Unknown error");
            }
          }}
          style={{
            borderRadius: 14,
            paddingVertical: 12,
            alignItems: "center",
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "700" }}>Refresh</Text>
        </Pressable>

        <Card colors={colors}>
          <Text style={[commonStyles.sectionTitle, { color: colors.text }]}>Category Progress</Text>
          {homeSummary?.category_progress_items.map((item) => {
            const over = item.remaining_amount_cents < 0;
            return (
              <View
                key={item.category_id}
                style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, gap: 8 }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>
                    {item.category_name}
                  </Text>
                  <Text style={{ color: over ? colors.danger : colors.subtext, fontWeight: "700" }}>
                    {item.percent_used}%
                  </Text>
                </View>

                <ProgressBar percent={item.percent_used} color={item.category_color} colors={colors} />

                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: colors.subtext }}>Spent {formatCents(item.spent_amount_cents)}</Text>
                  <Text style={{ color: colors.subtext }}>Budget {formatCents(item.budget_amount_cents)}</Text>
                </View>

                <Text style={{ color: over ? colors.danger : colors.success, fontWeight: "600" }}>
                  Remaining {formatCents(item.remaining_amount_cents)}
                </Text>
              </View>
            );
          })}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}