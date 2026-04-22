import React, { useEffect, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../components/Card";
import { LabeledInput } from "../components/LabeledInput";
import { PillSelector } from "../components/PillSelector";
import { SectionHeader } from "../components/SectionHeader";
import { commonStyles } from "../styles/common";
import { ThemeColors } from "../styles/theme";
import { BudgetSuggestionsResponse, CategoryBudget } from "../types";
import { formatCents } from "../lib/format";

export function CategoriesScreen({
  colors,
  budgets,
  smartBudgetingEnabled,
  budgetSuggestions,
  onAddCategory,
  onDeleteCategory,
  onSaveBudget,
}: {
  colors: ThemeColors;
  budgets: CategoryBudget[];
  smartBudgetingEnabled: boolean;
  budgetSuggestions: BudgetSuggestionsResponse | null;
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
  const actionableSuggestions = smartBudgetingEnabled
    ? (budgetSuggestions?.budget_suggestions ?? []).filter(
        (item) => item.confidence === "high" && item.recommendation_direction !== "keep"
      )
    : [];
  const suggestionByCategory = new Map(
    actionableSuggestions.map((item) => [item.category_id, item])
  );

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

        {smartBudgetingEnabled && budgetSuggestions && actionableSuggestions.length > 0 ? (
          <Card colors={colors}>
            <SectionHeader
              colors={colors}
              title="Smart suggestions"
              subtitle={`Based on ${budgetSuggestions.summary.lookback_days} days of spending, recurring bills, and income fit`}
            />

            <View style={[commonStyles.rowBetween, { alignItems: "flex-start" }]}>
              <View style={{ gap: 4, flex: 1, paddingRight: 12 }}>
                <Text style={[commonStyles.caption, { color: colors.textMuted }]}>
                  Suggested total
                </Text>
                <Text style={[commonStyles.money, { color: colors.text, fontSize: 22 }]}>
                  {formatCents(budgetSuggestions.summary.suggested_budget_total_cents)}
                </Text>
              </View>

              <View style={{ gap: 4, alignItems: "flex-end" }}>
                <Text style={[commonStyles.caption, { color: colors.textMuted }]}>
                  After income
                </Text>
                <Text
                  style={[
                    commonStyles.money,
                    {
                      color:
                        budgetSuggestions.summary.suggested_remaining_cents >= 0
                          ? colors.success
                          : colors.danger,
                      fontSize: 22,
                    },
                  ]}
                >
                  {formatCents(budgetSuggestions.summary.suggested_remaining_cents)}
                </Text>
              </View>
            </View>

            {budgetSuggestions.summary.needs_income_fit_review ? (
              <Text style={[commonStyles.caption, { color: colors.warning }]}>
                Suggestions were adjusted because planned category spending is tight against net income.
              </Text>
            ) : null}
          </Card>
        ) : null}

        <Card colors={colors}>
          <SectionHeader
            colors={colors}
            title="Budget caps"
            subtitle="Control spending limits by category"
          />

          <View style={{ gap: 14 }}>
            {budgets.map((item) => {
              const suggestion = suggestionByCategory.get(item.category_id);
              const suggestedAmount = suggestion
                ? (suggestion.suggested_budget_cents / 100).toFixed(2)
                : null;

              return (
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

                {suggestion ? (
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 18,
                      padding: 12,
                      gap: 10,
                      backgroundColor: colors.surfaceElevated,
                    }}
                  >
                    <View style={[commonStyles.rowBetween, { alignItems: "flex-start" }]}>
                      <View style={{ flex: 1, gap: 3, paddingRight: 12 }}>
                        <Text style={[commonStyles.label, { color: colors.text }]}>
                          Smart budget: {formatCents(suggestion.suggested_budget_cents)}
                        </Text>
                        <Text style={[commonStyles.caption, { color: colors.textMuted }]}>
                          {suggestion.reason} - {suggestion.confidence} confidence
                        </Text>
                      </View>

                      <Text
                        style={[
                          commonStyles.label,
                          {
                            color:
                              suggestion.recommendation_direction === "increase"
                                ? colors.warning
                                : suggestion.recommendation_direction === "decrease"
                                  ? colors.success
                                  : colors.textMuted,
                            textTransform: "capitalize",
                          },
                        ]}
                      >
                        {suggestion.recommendation_direction}
                      </Text>
                    </View>

                    <Text style={[commonStyles.caption, { color: colors.textMuted }]}>
                      Avg {formatCents(suggestion.average_spent_cents)} - recurring{" "}
                      {formatCents(suggestion.predictable_spend_cents)} - variable{" "}
                      {formatCents(suggestion.variable_spent_cents)}
                    </Text>

                    {suggestedAmount && suggestion.recommendation_direction !== "keep" ? (
                      <Pressable
                        onPress={() => {
                          setDrafts((prev) => ({ ...prev, [item.category_id]: suggestedAmount }));
                          setCadences((prev) => ({
                            ...prev,
                            [item.category_id]: suggestion.tracking_cadence,
                          }));
                        }}
                        style={[
                          commonStyles.secondaryButton,
                          {
                            borderColor: colors.border,
                            backgroundColor: colors.surfaceRaised,
                            paddingVertical: 10,
                          },
                        ]}
                      >
                        <Text style={[commonStyles.label, { color: colors.text }]}>
                          Use Suggestion
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}

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
              );
            })}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
