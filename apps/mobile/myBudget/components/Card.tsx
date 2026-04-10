import React from "react";
import { View, ViewStyle } from "react-native";
import { commonStyles } from "../styles/common";
import { ThemeColors } from "../styles/theme";

export function Card({
  colors,
  children,
  style,
  elevated = false,
}: {
  colors: ThemeColors;
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
}) {
  return (
    <View
      style={[
        commonStyles.card,
        {
          backgroundColor: elevated ? colors.surfaceElevated : colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}