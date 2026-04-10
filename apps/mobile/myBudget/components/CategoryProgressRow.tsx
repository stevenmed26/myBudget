import React from "react";
import { Text, View } from "react-native";
import { ProgressBar } from "./ProgressBar";
import { ThemeColors } from "../styles/theme";

function formatCents(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toFixed(2)}`;
}

export function CategoryProgressRow({
  colors,
  name,
  color,
  percentUsed,
  spent,
  budget,
  remaining,
}: {
  colors: ThemeColors;
  name: string;
  color: string;
  percentUsed: number;
  spent: number;
  budget: number;
  remaining: number;
}) {
  const over = remaining < 0;

  return (
    <View
      style={{
        paddingVertical: 8,
        gap: 10,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              backgroundColor: color,
            }}
          />
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>{name}</Text>
        </View>

        <Text style={{ color: over ? colors.danger : colors.textMuted, fontWeight: "700" }}>
          {percentUsed}%
        </Text>
      </View>

      <ProgressBar percent={percentUsed} color={color} colors={colors} />

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>
          {formatCents(spent)} of {formatCents(budget)}
        </Text>
        <Text
          style={{
            color: over ? colors.danger : colors.textSoft,
            fontSize: 13,
            fontWeight: "600",
          }}
        >
          {over ? "Over " : "Left "}
          {formatCents(Math.abs(remaining))}
        </Text>
      </View>
    </View>
  );
}