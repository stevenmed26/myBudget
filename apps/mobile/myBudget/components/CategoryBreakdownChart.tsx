import React from "react";
import { Text, View } from "react-native";
import { AnalyticsCategorySlice } from "../types";
import { ThemeColors } from "../styles/theme";
import { formatCents } from "../lib/format";
import { commonStyles } from "../styles/common";

export function CategoryBreakdownChart({
  colors,
  items,
}: {
  colors: ThemeColors;
  items: AnalyticsCategorySlice[];
}) {
  const filtered = items
    .filter((item) => Number(item.amount_cents) > 0)
    .slice(0, 6)
    .map((item) => ({
      ...item,
      amount_cents: Number(item.amount_cents) || 0,
    }));

  if (!filtered.length) {
    return <Text style={{ color: colors.textMuted }}>No category spending yet.</Text>;
  }

  const total = filtered.reduce((sum, item) => sum + item.amount_cents, 0);

  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 8 }}>
        <View style={commonStyles.rowBetween}>
          <Text style={[commonStyles.caption, { color: colors.textMuted }]}>
            Spending distribution
          </Text>
          <Text style={[commonStyles.label, { color: colors.text }]}>
            {formatCents(total)}
          </Text>
        </View>

        <View
          style={{
            height: 18,
            borderRadius: 999,
            overflow: "hidden",
            backgroundColor: colors.bgSecondary,
            borderWidth: 1,
            borderColor: colors.border,
            flexDirection: "row",
          }}
        >
          {filtered.map((item, index) => {
            const percent = total > 0 ? (item.amount_cents / total) * 100 : 0;

            return (
              <View
                key={item.category_id ?? `${item.category_name}-${index}`}
                style={{
                  width: `${percent}%`,
                  backgroundColor: item.color,
                  minWidth: percent > 0 ? 6 : 0,
                }}
              />
            );
          })}
        </View>
      </View>

      <View style={{ gap: 10 }}>
        {filtered.map((item, index) => {
          const percent = total > 0 ? Math.round((item.amount_cents / total) * 100) : 0;

          return (
            <View
              key={item.category_id ?? `${item.category_name}-${index}`}
              style={{
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: colors.border,
                paddingTop: index === 0 ? 0 : 10,
                gap: 8,
              }}
            >
              <View style={commonStyles.rowBetween}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    flex: 1,
                    paddingRight: 12,
                  }}
                >
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      backgroundColor: item.color,
                    }}
                  />
                  <Text
                    style={[commonStyles.label, { color: colors.text, flexShrink: 1 }]}
                    numberOfLines={1}
                  >
                    {item.category_name}
                  </Text>
                </View>

                <View style={{ alignItems: "flex-end", gap: 2 }}>
                  <Text style={[commonStyles.label, { color: colors.text }]}>
                    {formatCents(item.amount_cents)}
                  </Text>
                  <Text style={[commonStyles.caption, { color: colors.textMuted }]}>
                    {percent}%
                  </Text>
                </View>
              </View>

              <View
                style={{
                  height: 8,
                  borderRadius: 999,
                  overflow: "hidden",
                  backgroundColor: colors.bgSecondary,
                }}
              >
                <View
                  style={{
                    width: `${percent}%`,
                    height: "100%",
                    borderRadius: 999,
                    backgroundColor: item.color,
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}