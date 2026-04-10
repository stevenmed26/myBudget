import { useColorScheme } from "react-native";
import { useMemo } from "react";

export type ThemeColors = {
  bg: string;
  card: string;
  border: string;
  text: string;
  subtext: string;
  accent: string;
  danger: string;
  success: string;
};

export function useAppColors(): ThemeColors {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  return useMemo(
    () => ({
      bg: isDark ? "#0B1220" : "#F8FAFC",
      card: isDark ? "#111827" : "#FFFFFF",
      border: isDark ? "#1F2937" : "#E5E7EB",
      text: isDark ? "#F9FAFB" : "#111827",
      subtext: isDark ? "#9CA3AF" : "#6B7280",
      accent: "#2563EB",
      danger: "#DC2626",
      success: "#16A34A",
    }),
    [isDark]
  );
}