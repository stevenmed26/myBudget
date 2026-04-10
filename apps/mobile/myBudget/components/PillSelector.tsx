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
  return (
    <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
      {options.map((option) => {
        const active = selected === option;
        const fill = accentColor ?? colors.accent;

        return (
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: active ? fill : colors.border,
              backgroundColor: active ? fill : colors.card,
            }}
          >
            <Text style={{ color: active ? "#FFFFFF" : colors.text, fontWeight: "600" }}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}