import React from "react";
import { Text } from "react-native";
import { Card } from "./Card";
import { ThemeColors } from "../styles/theme";

export function StatCard({
  colors,
  label,
  value,
  valueColor,
}: {
  colors: ThemeColors;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <Card colors={colors} style={{ flex: 1 }}>
      <Text style={{ color: colors.subtext, fontSize: 13 }}>{label}</Text>
      <Text
        style={{
          color: valueColor ?? colors.text,
          fontSize: 22,
          fontWeight: "700",
          marginTop: 6,
        }}
      >
        {value}
      </Text>
    </Card>
  );
}