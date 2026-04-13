import React from "react";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ThemeColors } from "../styles/theme";

function formatCents(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toFixed(2)}`;
}

export function HeroBudgetCard({
  colors,
  periodLabel,
  cadenceLabel,
  remaining,
  budget,
  spent,
  onClosePeriod,
  onRefresh,
}: {
  colors: ThemeColors;
  periodLabel: string;
  cadenceLabel: string;
  remaining: number;
  budget: number;
  spent: number;
  onClosePeriod: () => void;
  onRefresh: () => void;
}) {
  const negative = remaining < 0;

  return (
    <LinearGradient
      colors={
        negative
          ? ["#2A1116", "#1B1416"]
          : [colors.surfaceRaised, colors.surfaceElevated]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 28,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 18,
        shadowColor: colors.shadow,
        shadowOpacity: 0.25,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
        elevation: 10,
      }}
    >
      <View style={{ gap: 4 }}>
        <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: "600" }}>
          {periodLabel}
        </Text>
        <Text
          style={{
            color: negative ? colors.danger : colors.text,
            fontSize: 40,
            fontWeight: "700",
            letterSpacing: -1.4,
          }}
        >
          {formatCents(remaining)}
        </Text>
        <Text style={{ color: colors.textSoft, fontSize: 14 }}>
          Budget {formatCents(budget)} · Spent {formatCents(spent)} · {cadenceLabel}
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <Pressable
          onPress={onClosePeriod}
          style={{
            flex: 1,
            backgroundColor: colors.accent,
            borderRadius: 18,
            paddingVertical: 15,
            alignItems: "center",
          }}
        >
          <Text style={{ color: colors.white, fontWeight: "700", fontSize: 16 }}>
            Close Period
          </Text>
        </Pressable>

        <Pressable
          onPress={onRefresh}
          style={{
            flex: 1,
            backgroundColor: colors.bgSecondary,
            borderRadius: 18,
            paddingVertical: 15,
            alignItems: "center",
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16 }}>
            Refresh
          </Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}