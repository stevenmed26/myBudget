import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { Calendar, DateData } from "react-native-calendars";

import { commonStyles } from "../styles/common";
import { ThemeColors } from "../styles/theme";

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toISODate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function firstDateForWeekday(weekday: number) {
  const now = new Date();
  const candidate = new Date(now.getFullYear(), now.getMonth(), 1);
  while (candidate.getDay() !== weekday) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return toISODate(candidate);
}

function weekdayMarkedDates(weekday: number, colors: ThemeColors) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const marked: Record<string, { selected: boolean; selectedColor: string; selectedTextColor: string }> = {};

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    if (date.getDay() === weekday) {
      marked[toISODate(date)] = {
        selected: true,
        selectedColor: colors.accent,
        selectedTextColor: colors.white,
      };
    }
  }

  return marked;
}

export function WeekStartPicker({
  colors,
  value,
  onChange,
}: {
  colors: ThemeColors;
  value: number;
  onChange: (value: number) => void;
}) {
  const markedDates = useMemo(
    () => weekdayMarkedDates(value, colors),
    [colors, value]
  );

  function handleDayPress(day: DateData) {
    onChange(new Date(day.year, day.month - 1, day.day).getDay());
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={[commonStyles.rowBetween, { alignItems: "center" }]}>
        <Text style={[commonStyles.inputLabel, { color: colors.text, marginBottom: 0 }]}>
          Week starts on
        </Text>
        <Text style={[commonStyles.caption, { color: colors.textMuted }]}>
          {WEEKDAY_NAMES[value]}
        </Text>
      </View>

      <Calendar
        current={firstDateForWeekday(value)}
        hideExtraDays
        onDayPress={handleDayPress}
        markedDates={markedDates}
        theme={{
          calendarBackground: colors.surfaceRaised,
          textSectionTitleColor: colors.textMuted,
          selectedDayBackgroundColor: colors.accent,
          selectedDayTextColor: colors.white,
          todayTextColor: colors.accent,
          dayTextColor: colors.text,
          textDisabledColor: colors.textMuted,
          monthTextColor: colors.text,
          arrowColor: colors.accent,
          textDayFontFamily: "Inter_400Regular",
          textMonthFontFamily: "Inter_700Bold",
          textDayHeaderFontFamily: "Inter_600SemiBold",
        }}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 18,
          overflow: "hidden",
        }}
      />
    </View>
  );
}
