import React from "react";
import { Text, View } from "react-native";
import { Card } from "./Card";
import { ThemeColors } from "../styles/theme";
import { commonStyles } from "../styles/common";
import { formatCents } from "../lib/format";

export function HeroBudgetCard({
  colors,
  periodLabel,
  trackingCadence,
  remainingAmountCents,
  spentAmountCents,
  netIncomeBudgetCents,
}: {
  colors: ThemeColors;
  periodLabel: string;
  trackingCadence: string;
  remainingAmountCents: number;
  spentAmountCents: number;
  netIncomeBudgetCents: number;
}) {
  const negative = remainingAmountCents < 0;

  return (
    <Card
      colors={colors}
      style={{
        gap: 16,
        backgroundColor: colors.surfaceElevated,
        borderColor: colors.border,
      }}
    >
      <View style={{ gap: 4 }}>
        <Text style={[commonStyles.eyebrow, { color: colors.textMuted }]}>
          Current Period
        </Text>

        <Text style={[commonStyles.sectionTitle, { color: colors.text }]}>
          {periodLabel}
        </Text>

        <Text style={[commonStyles.body, { color: colors.textMuted }]}>
          Tracking cadence: {trackingCadence}
        </Text>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={[commonStyles.caption, { color: colors.textMuted }]}>
          Remaining
        </Text>

        <Text
          style={[
            commonStyles.moneyLarge,
            {
              color: negative ? colors.danger : colors.success,
            },
          ]}
        >
          {formatCents(remainingAmountCents)}
        </Text>
      </View>

      <View style={commonStyles.row}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[commonStyles.caption, { color: colors.textMuted }]}>
            Budget
          </Text>
          <Text style={[commonStyles.money, { color: colors.text }]}>
            {formatCents(netIncomeBudgetCents)}
          </Text>
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[commonStyles.caption, { color: colors.textMuted }]}>
            Spent
          </Text>
          <Text style={[commonStyles.money, { color: colors.danger }]}>
            {formatCents(spentAmountCents)}
          </Text>
        </View>
      </View>
    </Card>
  );
}