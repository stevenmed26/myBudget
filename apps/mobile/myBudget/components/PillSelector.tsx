import React from "react";
import { Pressable, Text, View } from "react-native";
import { ThemeColors } from "../styles/theme";

export function PillSelector<T extends string>({
  options,
  selected,
  onSelect,
  colors,
  accentColor,
}: {
  options: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
  colors: ThemeColors;
  accentColor?: string;
}) {
  const activeColor = accentColor ?? colors.accent;

  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
      }}
    >
      {options.map((option) => {
        const isActive = selected === option;

        return (
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: isActive ? activeColor : colors.border,
              backgroundColor: isActive ? activeColor : colors.surfaceElevated,
            }}
          >
            <Text
              style={{
                color: isActive ? colors.white : colors.text,
                fontWeight: "600",
                fontSize: 14,
                letterSpacing: 0.1,
                textTransform: "capitalize",
              }}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}