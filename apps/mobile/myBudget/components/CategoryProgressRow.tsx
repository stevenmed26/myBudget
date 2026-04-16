import React from "react";
import { Text, View } from "react-native";
import { ProgressBar } from "./ProgressBar";
import { ThemeColors } from "../styles/theme";
import { commonStyles } from "../styles/common";
import { formatCents } from "../lib/format";

export function CategoryProgressRow({
  colors,
  categoryName,
  categoryColor,
  spentAmountCents,
  budgetAmountCents,
  remainingAmountCents,
  percentUsed,
}: {
  colors: ThemeColors;
  categoryName: string;
  categoryColor: string;
  spentAmountCents: number;
  budgetAmountCents: number;
  remainingAmountCents: number;
  percentUsed: number;
}) {
  const overBudget = remainingAmountCents < 0;

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 12,
        gap: 8,
      }}
    >
      <View style={commonStyles.rowBetween}>
        <Text style={[commonStyles.label, { color: colors.text }]}>
          {categoryName}
        </Text>

        <Text
          style={[
            commonStyles.caption,
            {
              color: overBudget ? colors.danger : colors.textMuted,
            },
          ]}
        >
          {percentUsed}%
        </Text>
      </View>

      <ProgressBar
        percent={percentUsed}
        color={categoryColor}
        colors={colors}
      />

      <View style={commonStyles.rowBetween}>
        <Text style={[commonStyles.caption, { color: colors.textMuted }]}>
          Spent {formatCents(spentAmountCents)}
        </Text>

        <Text style={[commonStyles.caption, { color: colors.textMuted }]}>
          Budget {formatCents(budgetAmountCents)}
        </Text>
      </View>

      <Text
        style={[
          commonStyles.caption,
          {
            color: overBudget ? colors.danger : colors.success,
          },
        ]}
      >
        Remaining {formatCents(remainingAmountCents)}
      </Text>
    </View>
  );
}