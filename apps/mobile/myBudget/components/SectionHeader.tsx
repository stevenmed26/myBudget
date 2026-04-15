import React from "react";
import { Text, View } from "react-native";
import { ThemeColors } from "../styles/theme";
import { commonStyles } from "../styles/common";

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
      <Text style={[commonStyles.sectionTitle, { color: colors.text }]}>
        {title}
      </Text>

      {subtitle ? (
        <Text style={[commonStyles.body, { color: colors.textMuted }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}