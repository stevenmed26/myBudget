import React from "react";
import { Text } from "react-native";
import { Card } from "./Card";
import { ThemeColors } from "../styles/theme";
import { commonStyles } from "../styles/common";

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
      <Text style={[commonStyles.caption, { color: colors.textMuted }]}>
        {label}
      </Text>

      <Text
        style={[
          commonStyles.money,
          {
            color: valueColor ?? colors.text,
            fontSize: 24,
            letterSpacing: -0.6,
          },
        ]}
      >
        {value}
      </Text>
    </Card>
  );
}