import React from "react";
import { Text, View } from "react-native";
import ColorPicker, { HueSlider, Panel1, Preview } from "reanimated-color-picker";

import { commonStyles } from "../styles/common";
import { ThemeColors } from "../styles/theme";

export function ColorWheelPicker({
  colors,
  value,
  onChange,
}: {
  colors: ThemeColors;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={[commonStyles.inputLabel, { color: colors.text }]}>Color</Text>

      <ColorPicker
        value={value}
        onCompleteJS={(pickedColor) => onChange(pickedColor.hex)}
        sliderThickness={18}
        thumbSize={24}
        boundedThumb
        style={{ gap: 12 }}
      >
        <Preview
          colorFormat="hex"
          style={{
            height: 50,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
          textStyle={{
            color: colors.white,
            fontFamily: "Inter_600SemiBold",
            fontSize: 14,
          }}
        />
        <Panel1
          style={{
            height: 170,
            borderRadius: 18,
            overflow: "hidden",
          }}
        />
        <HueSlider
          style={{
            height: 18,
            borderRadius: 999,
          }}
        />
      </ColorPicker>
    </View>
  );
}
