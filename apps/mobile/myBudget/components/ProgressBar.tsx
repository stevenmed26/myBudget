import React from "react";
import { View } from "react-native";
import { ThemeColors } from "../styles/theme";

export function ProgressBar({
  percent,
  color,
  colors,
}: {
  percent: number;
  color: string;
  colors: ThemeColors;
}) {
  const capped = Math.max(0, Math.min(100, percent));

  return (
    <View
      style={{
        height: 8,
        backgroundColor: colors.bgSecondary,
        borderRadius: 999,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${capped}%`,
          height: "100%",
          backgroundColor: color,
          borderRadius: 999,
        }}
      />
    </View>
  );
}