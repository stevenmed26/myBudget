import { useColorScheme } from "react-native";
import { useMemo } from "react";

export type ThemeColors = {
  bg: string;
  bgSecondary: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  text: string;
  textMuted: string;
  textSoft: string;
  accent: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  white: string;
};

export function useAppColors(): ThemeColors {
  const scheme = useColorScheme();
  const isDark = scheme !== "light";

  return useMemo(() => {
    if (isDark) {
      return {
        bg: "#0B1020",
        bgSecondary: "#0F172A",
        surface: "#111827",
        surfaceElevated: "#172033",
        border: "rgba(255,255,255,0.06)",
        text: "#F8FAFC",
        textMuted: "#94A3B8",
        textSoft: "#CBD5E1",
        accent: "#5B7FFF",
        accentSoft: "rgba(91,127,255,0.14)",
        success: "#2EC27E",
        successSoft: "rgba(46,194,126,0.14)",
        danger: "#F97373",
        dangerSoft: "rgba(249,115,115,0.14)",
        warning: "#F59E0B",
        warningSoft: "rgba(245,158,11,0.14)",
        white: "#FFFFFF",
      };
    }

    return {
      bg: "#F4F7FB",
      bgSecondary: "#EAF0F8",
      surface: "#FFFFFF",
      surfaceElevated: "#F8FAFC",
      border: "rgba(15,23,42,0.08)",
      text: "#0F172A",
      textMuted: "#64748B",
      textSoft: "#475569",
      accent: "#4F7CFF",
      accentSoft: "rgba(79,124,255,0.12)",
      success: "#16A34A",
      successSoft: "rgba(22,163,74,0.10)",
      danger: "#DC2626",
      dangerSoft: "rgba(220,38,38,0.10)",
      warning: "#D97706",
      warningSoft: "rgba(217,119,6,0.10)",
      white: "#FFFFFF",
    };
  }, [isDark]);
}