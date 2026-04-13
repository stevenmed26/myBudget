import React from "react";
import { Text, View } from "react-native";
import { ThemeColors } from "../styles/theme";

export function SectionHeader({
  colors,
  title,
  subtitle,
}: {
  colors: ThemeColors;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700", letterSpacing: -0.4 }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>{subtitle}</Text>
      ) : null}
    </View>
  );
}