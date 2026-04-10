import React from "react";
import { View, ViewStyle } from "react-native";
import { commonStyles } from "../styles/common";
import { ThemeColors } from "../styles/theme";

export function Card({
  colors,
  children,
  style,
}: {
  colors: ThemeColors;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        commonStyles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}