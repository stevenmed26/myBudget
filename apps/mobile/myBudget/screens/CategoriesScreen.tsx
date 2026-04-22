import React, { useEffect, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
  onAddCategory,
  onDeleteCategory,
  onSaveBudget,
}: {
  colors: ThemeColors;
  budgets: CategoryBudget[];
  onAddCategory: (input: {
    name: string;
    color: string;
    amount: string;
    cadence: "weekly" | "monthly" | "yearly";
  }) => Promise<void>;
  onDeleteCategory: (categoryID: string) => Promise<void>;
  onSaveBudget: (categoryID: string, amount: string, cadence: "weekly" | "monthly" | "yearly") => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [cadences, setCadences] = useState<Record<string, "weekly" | "monthly" | "yearly">>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#4F7CFF");
  const [newAmount, setNewAmount] = useState("0.00");
  const [newCadence, setNewCadence] = useState<"weekly" | "monthly" | "yearly">("weekly");

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
        <View style={[commonStyles.rowBetween, { alignItems: "flex-start" }]}>
          <View style={{ gap: 6, flex: 1, paddingRight: 12 }}>
            <Text style={[commonStyles.eyebrow, { color: colors.textMuted }]}>Planning</Text>
            <Text style={[commonStyles.title, { color: colors.text }]}>Categories</Text>
          </View>

          <Pressable
            onPress={() => setIsAdding((value) => !value)}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.accent,
            }}
          >
            <Ionicons name={isAdding ? "close" : "add"} size={24} color={colors.white} />
          </Pressable>
        </View>

        {isAdding ? (
          <Card colors={colors}>
            <SectionHeader
              colors={colors}
              title="New category"
              subtitle="Create a budget category going forward"
            />

            <LabeledInput
              colors={colors}
              label="Name"
              placeholder="Category name"
              value={newName}
              onChangeText={setNewName}
            />

            <LabeledInput
              colors={colors}
              label="Color"
              placeholder="#4F7CFF"
              autoCapitalize="characters"
              value={newColor}
              onChangeText={setNewColor}
            />

            <LabeledInput
              colors={colors}
              label="Starting budget"
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={newAmount}
              onChangeText={setNewAmount}
            />

            <PillSelector
              options={["weekly", "monthly", "yearly"] as const}
              selected={newCadence}
              onSelect={setNewCadence}
              colors={colors}
              accentColor={newColor}
            />

            <Pressable
              onPress={async () => {
                try {
                  await onAddCategory({
                    name: newName,
                    color: newColor,
                    amount: newAmount,
                    cadence: newCadence,
                  });
                  setNewName("");
                  setNewColor("#4F7CFF");
                  setNewAmount("0.00");
                  setNewCadence("weekly");
                  setIsAdding(false);
                } catch (err: any) {
                  Alert.alert("Create failed", err?.message ?? "Unknown error");
                }
              }}
              style={[commonStyles.button, { backgroundColor: colors.accent }]}
            >
              <Text style={commonStyles.buttonText}>Create Category</Text>
            </Pressable>
          </Card>
        ) : null}

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
                <View style={[commonStyles.rowBetween, { alignItems: "flex-start" }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1, paddingRight: 12 }}>
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

                  <Pressable
                    onPress={() => {
                      Alert.alert(
                        "Delete category?",
                        "This hides the category going forward. Existing transactions and historical budget records stay unchanged.",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: async () => {
                              try {
                                await onDeleteCategory(item.category_id);
                              } catch (err: any) {
                                Alert.alert("Delete failed", err?.message ?? "Unknown error");
                              }
                            },
                          },
                        ]
                      );
                    }}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.dangerSoft,
                    }}
                  >
                    <Ionicons name="close" size={20} color={colors.danger} />
                  </Pressable>
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
