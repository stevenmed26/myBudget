import React from "react";
import { Pressable, Text } from "react-native";
import { ThemeColors } from "../styles/theme";
import { commonStyles } from "../styles/common";

export function ActionButton({
  label,
  onPress,
  colors,
  disabled = false,
}: {
  label: string;
  onPress: () => void | Promise<void>;
  colors: ThemeColors;
  disabled?: boolean;
}) {
  return (
    <Pressable 
        onPress={onPress}
        disabled={disabled}
        style={[
            commonStyles.button,
            {
                backgroundColor: disabled ? colors.textMuted : colors.accent,
                opacity: disabled ? 0.7 : 1,
            },
        ]}
    >
        <Text style={commonStyles.buttonText}>{label}</Text>
    </Pressable>
  );
}