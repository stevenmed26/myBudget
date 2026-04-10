import React from "react";
import { Text, TextInput, TextInputProps, View } from "react-native";
import { commonStyles } from "../styles/common";
import { ThemeColors } from "../styles/theme";

export function LabeledInput({
  colors,
  label,
  ...props
}: {
  colors: ThemeColors;
  label: string;
} & TextInputProps) {
  return (
    <View>
      <Text style={[commonStyles.inputLabel, { color: colors.textSoft }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[
          commonStyles.input,
          {
            borderColor: colors.border,
            backgroundColor: colors.surfaceElevated,
            color: colors.text,
          },
        ]}
        {...props}
      />
    </View>
  );
}