import React from "react";
import { Text, View } from "react-native";
import { AnalyticsTrendPoint } from "../types";
import { ThemeColors } from "../styles/theme";
import { commonStyles } from "../styles/common";
import { formatCents } from "../lib/format";

const CHART_HEIGHT = 180;
const GRID_LINES = 4;
const BAR_WIDTH = 12;
const GROUP_GAP = 18;
const PAIR_GAP = 6;

export function TrendBarChart({
  colors,
  items,
}: {
  colors: ThemeColors;
  items: AnalyticsTrendPoint[];
}) {
  if (!items.length) {
    return <Text style={{ color: colors.textMuted }}>No trend data yet.</Text>;
  }

  const safeItems = items.map((item) => ({
    ...item,
    income_cents: Number(item.income_cents) || 0,
    expense_cents: Number(item.expense_cents) || 0,
  }));

  const maxValue = Math.max(
    ...safeItems.flatMap((item) => [item.income_cents, item.expense_cents]),
    1
  );

  const axisTicks = Array.from({ length: GRID_LINES + 1 }, (_, index) => {
    const value = Math.round((maxValue * (GRID_LINES - index)) / GRID_LINES);
    return value;
  });

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "stretch" }}>
        <View
          style={{
            width: 56,
            height: CHART_HEIGHT,
            justifyContent: "space-between",
            paddingRight: 10,
          }}
        >
          {axisTicks.map((value, index) => (
            <Text
              key={`${value}-${index}`}
              style={[
                commonStyles.caption,
                {
                  color: colors.textMuted,
                  textAlign: "right",
                  lineHeight: 14,
                },
              ]}
              numberOfLines={1}
            >
              {formatCompactCurrency(value)}
            </Text>
          ))}
        </View>

        <View style={{ flex: 1, height: CHART_HEIGHT, position: "relative" }}>
          <View
            style={{
              ...fill,
              justifyContent: "space-between",
            }}
          >
            {axisTicks.map((_, index) => (
              <View
                key={index}
                style={{
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              />
            ))}
          </View>

          <View
            style={{
              ...fill,
              flexDirection: "row",
              alignItems: "flex-end",
              justifyContent: "space-between",
              paddingHorizontal: 4,
            }}
          >
            {safeItems.map((item) => {
              const incomeHeight = Math.max(
                (item.income_cents / maxValue) * CHART_HEIGHT,
                item.income_cents > 0 ? 6 : 0
              );
              const expenseHeight = Math.max(
                (item.expense_cents / maxValue) * CHART_HEIGHT,
                item.expense_cents > 0 ? 6 : 0
              );

              return (
                <View
                  key={item.label}
                  style={{
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 10,
                    flex: 1,
                    maxWidth: BAR_WIDTH * 2 + PAIR_GAP + GROUP_GAP,
                  }}
                >
                  <View
                    style={{
                      height: CHART_HEIGHT,
                      justifyContent: "flex-end",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-end",
                        gap: PAIR_GAP,
                      }}
                    >
                      <View
                        style={{
                          width: BAR_WIDTH,
                          height: incomeHeight,
                          minHeight: item.income_cents > 0 ? 6 : 0,
                          backgroundColor: colors.success,
                          borderRadius: 999,
                        }}
                      />
                      <View
                        style={{
                          width: BAR_WIDTH,
                          height: expenseHeight,
                          minHeight: item.expense_cents > 0 ? 6 : 0,
                          backgroundColor: colors.danger,
                          borderRadius: 999,
                        }}
                      />
                    </View>
                  </View>

                  <Text
                    style={[
                      commonStyles.caption,
                      {
                        color: colors.textMuted,
                        textAlign: "center",
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {item.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 16, paddingHorizontal: 8 }}>
        <LegendDot color={colors.success} label="Income" textColor={colors.textMuted} />
        <LegendDot color={colors.danger} label="Expense" textColor={colors.textMuted} />
      </View>
    </View>
  );
}

function LegendDot({
  color,
  label,
  textColor,
}: {
  color: string;
  label: string;
  textColor: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          backgroundColor: color,
        }}
      />
      <Text style={{ color: textColor }}>{label}</Text>
    </View>
  );
}

function formatCompactCurrency(cents: number) {
  const dollars = cents / 100;

  if (dollars >= 1000) {
    return `$${Math.round(dollars / 1000)}k`;
  }

  return `$${Math.round(dollars)}`;
}

const fill = {
  position: "absolute" as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};