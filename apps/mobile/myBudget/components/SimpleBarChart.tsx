import React from "react";
import { Text, View } from "react-native";
import { ThemeColors } from "../styles/theme";

export function SimpleBarChart({
  colors,
  data,
}: {
  colors: ThemeColors;
  data: { label: string; value: number; color?: string }[];
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={{ gap: 12 }}>
      {data.map((item) => {
        const widthPct = Math.max(4, (item.value / max) * 100);

        return (
          <View key={item.label} style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: colors.textSoft, fontSize: 14 }}>{item.label}</Text>
              <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14 }}>
                ${(item.value / 100).toFixed(2)}
              </Text>
            </View>

            <View
              style={{
                height: 10,
                borderRadius: 999,
                backgroundColor: colors.bgSecondary,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${widthPct}%`,
                  height: "100%",
                  borderRadius: 999,
                  backgroundColor: item.color ?? colors.accent,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}