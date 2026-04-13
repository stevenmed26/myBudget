import { useColorScheme } from "react-native";
import { useMemo } from "react";

export type ThemeColors = {
  bg: string;
  bgSecondary: string;
  surface: string;
  surfaceElevated: string;
  surfaceRaised: string;
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
  shadow: string;
};

export function useAppColors(): ThemeColors {
  const scheme = useColorScheme();
  const isDark = scheme !== "light";

  return useMemo(() => {
    if (isDark) {
      return {
        bg: "#0A0A0B",
        bgSecondary: "#111214",
        surface: "#151618",
        surfaceElevated: "#1A1B1F",
        surfaceRaised: "#202228",
        border: "rgba(255,255,255,0.06)",
        text: "#F5F7FA",
        textMuted: "#A1A7B3",
        textSoft: "#C7CCD5",
        accent: "#6E8BFF",
        accentSoft: "rgba(110,139,255,0.14)",
        success: "#34D399",
        successSoft: "rgba(52,211,153,0.14)",
        danger: "#FB7185",
        dangerSoft: "rgba(251,113,133,0.14)",
        warning: "#F59E0B",
        warningSoft: "rgba(245,158,11,0.14)",
        white: "#FFFFFF",
        shadow: "#000000",
      };
    }

    return {
      bg: "#F4F6F8",
      bgSecondary: "#EAEFF5",
      surface: "#FFFFFF",
      surfaceElevated: "#F8FAFC",
      surfaceRaised: "#FFFFFF",
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
      shadow: "#000000",
    };
  }, [isDark]);
}