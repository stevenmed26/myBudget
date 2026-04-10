import React from "react";
import { Text } from "react-native";
import { Card } from "./Card";
import { ThemeColors } from "../styles/theme";

export function StatCard({
  colors,
  label,
  value,
  valueColor,
  elevated = false,
}: {
  colors: ThemeColors;
  label: string;
  value: string;
  valueColor?: string;
  elevated?: boolean;
}) {
  return (
    <Card colors={colors} elevated={elevated} style={{ flex: 1, gap: 8 }}>
      <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: "600" }}>{label}</Text>
      <Text
        style={{
          color: valueColor ?? colors.text,
          fontSize: 24,
          fontWeight: "700",
          letterSpacing: -0.6,
        }}
      >
        {value}
      </Text>
    </Card>
  );
}