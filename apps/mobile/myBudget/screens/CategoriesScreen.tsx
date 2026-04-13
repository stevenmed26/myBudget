import React, { useEffect, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Card } from "../components/Card";
import { LabeledInput } from "../components/LabeledInput";
import { PillSelector } from "../components/PillSelector";
import { SectionHeader } from "../components/SectionHeader";
import { commonStyles } from "../styles/common";
import { ThemeColors } from "../styles/theme";
import { CategoryBudget } from "../types";

export function CategoriesScreen({
  colors,
  budgets,
  onSaveBudget,
}: {
  colors: ThemeColors;
  budgets: CategoryBudget[];
  onSaveBudget: (categoryID: string, amount: string, cadence: "weekly" | "monthly" | "yearly") => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [cadences, setCadences] = useState<Record<string, "weekly" | "monthly" | "yearly">>({});

  useEffect(() => {
    const d: Record<string, string> = {};
    const c: Record<string, "weekly" | "monthly" | "yearly"> = {};
    for (const item of budgets) {
      d[item.category_id] = (item.amount_cents / 100).toFixed(2);
      c[item.category_id] = item.cadence;
    }
    setDrafts(d);
    setCadences(c);
  }, [budgets]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={commonStyles.screenContent}>
        <View style={{ gap: 6 }}>
          <Text style={[commonStyles.eyebrow, { color: colors.textMuted }]}>Planning</Text>
          <Text style={[commonStyles.title, { color: colors.text }]}>Categories</Text>
        </View>

        <Card colors={colors}>
          <SectionHeader
            colors={colors}
            title="Budget caps"
            subtitle="Control spending limits by category"
          />

          <View style={{ gap: 14 }}>
            {budgets.map((item) => (
              <View
                key={item.category_id}
                style={{
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  gap: 12,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      backgroundColor: item.category_color,
                    }}
                  />
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>
                    {item.category_name}
                  </Text>
                </View>

                <LabeledInput
                  colors={colors}
                  label="Budget amount"
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={drafts[item.category_id] ?? ""}
                  onChangeText={(value) => setDrafts((prev) => ({ ...prev, [item.category_id]: value }))}
                />

                <PillSelector
                  options={["weekly", "monthly", "yearly"] as const}
                  selected={cadences[item.category_id] ?? item.cadence}
                  onSelect={(value) => setCadences((prev) => ({ ...prev, [item.category_id]: value }))}
                  colors={colors}
                  accentColor={item.category_color}
                />

                <Pressable
                  onPress={async () => {
                    try {
                      await onSaveBudget(
                        item.category_id,
                        drafts[item.category_id] ?? "0",
                        cadences[item.category_id] ?? item.cadence
                      );
                      Alert.alert("Saved", "Category budget updated.");
                    } catch (err: any) {
                      Alert.alert("Save failed", err?.message ?? "Unknown error");
                    }
                  }}
                  style={[commonStyles.button, { backgroundColor: colors.accent }]}
                >
                  <Text style={commonStyles.buttonText}>Save Budget</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}