import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { Calendar, DateData } from "react-native-calendars";

import { commonStyles } from "../styles/common";
import { ThemeColors } from "../styles/theme";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function dateForCurrentMonthDay(day: number) {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(day)}`;
}

export function CalendarMonthPicker({
  colors,
  selectedDate,
  selectedDay,
  label = "Start date",
  onSelectDate,
  maxDay,
}: {
  colors: ThemeColors;
  selectedDate: string;
  selectedDay?: number;
  label?: string;
  onSelectDate: (value: string) => void;
  maxDay?: number;
}) {
  const activeDate = selectedDay ? dateForCurrentMonthDay(selectedDay) : selectedDate || todayISO();
  const markedDates = useMemo(
    () => ({
      [activeDate]: {
        selected: true,
        selectedColor: colors.accent,
        selectedTextColor: colors.white,
      },
    }),
    [activeDate, colors.accent, colors.white]
  );

  function handleDayPress(day: DateData) {
    if (maxDay !== undefined && day.day > maxDay) return;
    onSelectDate(day.dateString);
  }

  return (
    <View style={{ gap: 10 }}>
      <Text style={[commonStyles.inputLabel, { color: colors.text }]}>{label}</Text>
      <Calendar
        current={activeDate}
        hideExtraDays
        disableAllTouchEventsForDisabledDays
        onDayPress={handleDayPress}
        markedDates={markedDates}
        minDate={undefined}
        maxDate={maxDay ? dateForCurrentMonthDay(maxDay) : undefined}
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
