import React from "react";
import { Pressable, Text } from "react-native";
import { ThemeColors } from "../styles/theme";
import { commonStyles } from "../styles/common";

export function ActionButton({
  label,
  onPress,
  colors,
}: {
  label: string;
  onPress: () => void | Promise<void>;
  colors: ThemeColors;
}) {
  return (
    <Pressable onPress={onPress} style={[commonStyles.button, { backgroundColor: colors.accent }]}>
      <Text style={commonStyles.buttonText}>{label}</Text>
    </Pressable>
  );
}