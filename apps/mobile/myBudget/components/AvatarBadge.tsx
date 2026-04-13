import React from "react";
import { Text, View } from "react-native";
import { ThemeColors } from "../styles/theme";

function initials(text: string) {
  const parts = text.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function AvatarBadge({
  colors,
  label,
  tint,
}: {
  colors: ThemeColors;
  label: string;
  tint?: string;
}) {
  return (
    <View
      style={{
        width: 38,
        height: 38,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: tint ?? colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}>
        {initials(label)}
      </Text>
    </View>
  );
}