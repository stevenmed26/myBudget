import React from "react";
import { Pressable, Text, View } from "react-native";
import { commonStyles } from "../styles/common";
import { ThemeColors } from "../styles/theme";

export function ToggleRow({
  colors,
  title,
  subtitle,
  enabled,
  onToggle,
}: {
  colors: ThemeColors;
  title: string;
  subtitle: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={[
        commonStyles.rowBetween,
        {
          borderWidth: 1,
          borderColor: enabled ? colors.accent : colors.border,
          borderRadius: 18,
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: enabled ? colors.accentSoft : colors.surfaceRaised,
        },
      ]}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={[commonStyles.label, { color: colors.text }]}>{title}</Text>
        <Text style={[commonStyles.caption, { color: colors.textMuted }]}>{subtitle}</Text>
      </View>

      <View
        style={{
          width: 42,
          height: 24,
          borderRadius: 999,
          padding: 3,
          backgroundColor: enabled ? colors.accent : colors.border,
          alignItems: enabled ? "flex-end" : "flex-start",
        }}
      >
        <View
          style={{
            width: 18,
            height: 18,
            borderRadius: 999,
            backgroundColor: colors.white,
          }}
        />
      </View>
    </Pressable>
  );
}
