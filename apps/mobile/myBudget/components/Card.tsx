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
          shadowColor: colors.shadow,
          shadowOpacity: elevated ? 0.22 : 0.12,
          shadowRadius: elevated ? 18 : 10,
          shadowOffset: { width: 0, height: elevated ? 10 : 6 },
          elevation: elevated ? 8 : 3,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}