import React, { useEffect, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../components/Card";
import { LabeledInput } from "../components/LabeledInput";
import { PillSelector } from "../components/PillSelector";
import { SectionHeader } from "../components/SectionHeader";
import { ToggleRow } from "../components/ToggleRow";
import { CalendarMonthPicker } from "../components/CalendarMonthPicker";
import { commonStyles } from "../styles/common";
import { ThemeColors } from "../styles/theme";
import { BudgetProfile, Category, RecurringRule } from "../types";
import { formatCents } from "../lib/format";
import { requestLocationCode } from "../lib/location";

export function ProfileScreen({
  colors,
  profile,
  categories,
  recurringRules,
  onSaveProfile,
  onSaveRecurringRule,
  onRemoveRecurringRule,
  onLogout,
}: {
  colors: ThemeColors;
  profile: BudgetProfile | null;
  categories: Category[];
  recurringRules: RecurringRule[];
  onSaveProfile: (input: {
    incomeAmount: string;
    locationCode: string;
    trackingCadence: "weekly" | "monthly";
    smartBudgetingEnabled: boolean;
  }) => Promise<void>;
  onSaveRecurringRule: (input: {
    ruleID?: string;
    category_id: string;
    name: string;
    amount: string;
    rule_type: "expense" | "income";
    frequency: "weekly" | "biweekly" | "monthly" | "yearly";
    start_date: string;
    end_date?: string | null;
    active?: boolean;
  }) => Promise<void>;
  onRemoveRecurringRule: (ruleID: string) => Promise<void>;
  onLogout?: () => Promise<void>;
}) {
  const [incomeAmount, setIncomeAmount] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [locationCode, setLocationCode] = useState("US-TX");
  const [trackingCadence, setTrackingCadence] = useState<"weekly" | "monthly">("weekly");
  const [smartBudgetingEnabled, setSmartBudgetingEnabled] = useState(true);
  const [editingRuleID, setEditingRuleID] = useState<string | null>(null);
  const [ruleCategoryID, setRuleCategoryID] = useState("");
  const [ruleName, setRuleName] = useState("");
  const [ruleAmount, setRuleAmount] = useState("");
  const [ruleType, setRuleType] = useState<"expense" | "income">("expense");
  const [ruleFrequency, setRuleFrequency] =
    useState<"weekly" | "biweekly" | "monthly" | "yearly">("monthly");
  const [ruleStartDate, setRuleStartDate] = useState("");
  const [ruleEndDate, setRuleEndDate] = useState("");
  const [ruleActive, setRuleActive] = useState(true);

  useEffect(() => {
    if (!profile) return;
    setIncomeAmount((profile.income_amount_cents / 100).toFixed(2));
    setTaxRate((profile.estimated_tax_rate_bps / 100).toFixed(2));
    setLocationCode(profile.location_code || "US-TX");
    setTrackingCadence(profile.tracking_cadence);
    setSmartBudgetingEnabled(profile.smart_budgeting_enabled);
  }, [profile]);

  async function useCurrentLocation() {
    try {
      const nextLocationCode = await requestLocationCode();
      setLocationCode(nextLocationCode);
    } catch (err: any) {
      Alert.alert("Location unavailable", err?.message ?? "Unable to determine your tax location.");
    }
  }

  function beginEditRule(rule: RecurringRule) {
    setEditingRuleID(rule.id);
    setRuleCategoryID(rule.category_id);
    setRuleName(rule.name);
    setRuleAmount((rule.amount_cents / 100).toFixed(2));
    setRuleType(rule.rule_type);
    setRuleFrequency(rule.frequency);
    setRuleStartDate(rule.start_date);
    setRuleEndDate(rule.end_date ?? "");
    setRuleActive(rule.active);
  }

  function cancelEditRule() {
    setEditingRuleID(null);
    setRuleCategoryID("");
    setRuleName("");
    setRuleAmount("");
    setRuleType("expense");
    setRuleFrequency("monthly");
    setRuleStartDate("");
    setRuleEndDate("");
    setRuleActive(true);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={commonStyles.screenContent}>
        <View style={{ gap: 6 }}>
          <Text style={[commonStyles.eyebrow, { color: colors.textMuted }]}>Settings</Text>
          <Text style={[commonStyles.title, { color: colors.text }]}>Profile</Text>
        </View>

        <Card colors={colors}>
          <SectionHeader
            colors={colors}
            title="Budget setup"
            subtitle="These settings apply forward through new profile versions"
          />

          <LabeledInput
            colors={colors}
            label="Income"
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={incomeAmount}
            onChangeText={setIncomeAmount}
          />

          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 16,
              padding: 14,
              gap: 10,
              backgroundColor: colors.surfaceRaised,
            }}
          >
            <View style={commonStyles.rowBetween}>
              <View style={{ gap: 4 }}>
                <Text style={[commonStyles.inputLabel, { color: colors.text }]}>Withholding location</Text>
                <Text style={[commonStyles.body, { color: colors.text }]}>{locationCode}</Text>
              </View>

              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Text style={[commonStyles.inputLabel, { color: colors.text }]}>Estimated rate</Text>
                <Text style={[commonStyles.money, { color: colors.text }]}>{taxRate}%</Text>
              </View>
            </View>

            <Text style={[commonStyles.caption, { color: colors.textMuted }]}>
              Federal, state, Social Security, and Medicare withholding estimates are calculated automatically.
            </Text>

            <Pressable
              onPress={useCurrentLocation}
              style={[
                commonStyles.secondaryButton,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <Text style={[commonStyles.label, { color: colors.text }]}>Use My Location</Text>
            </Pressable>
          </View>

          <PillSelector
            options={["weekly", "monthly"] as const}
            selected={trackingCadence}
            onSelect={setTrackingCadence}
            colors={colors}
          />

          <ToggleRow
            colors={colors}
            title="Smart budgeting"
            subtitle="Show high-confidence budget recommendations"
            enabled={smartBudgetingEnabled}
            onToggle={() => setSmartBudgetingEnabled((value) => !value)}
          />

          <Pressable
            onPress={async () => {
              try {
                await onSaveProfile({
                  incomeAmount,
                  locationCode,
                  trackingCadence,
                  smartBudgetingEnabled,
                });
                Alert.alert("Saved", "Budget profile updated.");
              } catch (err: any) {
                Alert.alert("Save failed", err?.message ?? "Unknown error");
              }
            }}
            style={[commonStyles.button, { backgroundColor: colors.accent }]}
          >
            <Text style={commonStyles.buttonText}>Save Profile</Text>
          </Pressable>
        </Card>

        <Card colors={colors}>
          <SectionHeader
            colors={colors}
            title="Recurring transactions"
            subtitle="Repeating transactions currently attached to your budget"
          />

          {recurringRules.length === 0 ? (
            <Text style={[commonStyles.body, { color: colors.textMuted }]}>
              No recurring transactions yet.
            </Text>
          ) : (
            recurringRules.map((rule) => {
              const category = categories.find((item) => item.id === rule.category_id);
              const isExpense = rule.rule_type === "expense";
              const isEditing = editingRuleID === rule.id;

              return (
                <View
                  key={rule.id}
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    paddingTop: 12,
                    gap: 10,
                  }}
                >
                  {isEditing ? (
                    <View style={{ gap: 12 }}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{ flexDirection: "row", gap: 10 }}>
                          {categories
                            .filter((item) => item.counts_toward_budget)
                            .map((categoryItem) => {
                              const selected = categoryItem.id === ruleCategoryID;

                              return (
                                <Pressable
                                  key={categoryItem.id}
                                  onPress={() => setRuleCategoryID(categoryItem.id)}
                                  style={{
                                    paddingVertical: 10,
                                    paddingHorizontal: 14,
                                    borderRadius: 999,
                                    borderWidth: 1,
                                    borderColor: selected ? categoryItem.color : colors.border,
                                    backgroundColor: selected ? categoryItem.color : colors.surfaceRaised,
                                  }}
                                >
                                  <Text
                                    style={[
                                      commonStyles.label,
                                      { color: selected ? colors.white : colors.text },
                                    ]}
                                  >
                                    {categoryItem.name}
                                  </Text>
                                </Pressable>
                              );
                            })}
                        </View>
                      </ScrollView>

                      <LabeledInput
                        colors={colors}
                        label="Name"
                        placeholder="Recurring item"
                        value={ruleName}
                        onChangeText={setRuleName}
                      />

                      <LabeledInput
                        colors={colors}
                        label="Amount"
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                        value={ruleAmount}
                        onChangeText={setRuleAmount}
                      />

                      <PillSelector
                        options={["expense", "income"] as const}
                        selected={ruleType}
                        onSelect={setRuleType}
                        colors={colors}
                      />

                      <PillSelector
                        options={["weekly", "biweekly", "monthly", "yearly"] as const}
                        selected={ruleFrequency}
                        onSelect={setRuleFrequency}
                        colors={colors}
                      />

                      <CalendarMonthPicker
                        colors={colors}
                        label="Start date"
                        selectedDate={ruleStartDate}
                        onSelectDate={setRuleStartDate}
                      />

                      <LabeledInput
                        colors={colors}
                        label="End date"
                        placeholder="Optional YYYY-MM-DD"
                        value={ruleEndDate}
                        onChangeText={setRuleEndDate}
                      />

                      <ToggleRow
                        colors={colors}
                        title="Active"
                        subtitle="Turn this recurring item on or off"
                        enabled={ruleActive}
                        onToggle={() => setRuleActive((value) => !value)}
                      />

                      <View style={{ flexDirection: "row", gap: 10 }}>
                        <Pressable
                          onPress={cancelEditRule}
                          style={[
                            commonStyles.secondaryButton,
                            {
                              flex: 1,
                              borderColor: colors.border,
                              backgroundColor: colors.surfaceRaised,
                            },
                          ]}
                        >
                          <Text style={[commonStyles.label, { color: colors.text }]}>Cancel</Text>
                        </Pressable>

                        <Pressable
                          onPress={async () => {
                            try {
                              await onSaveRecurringRule({
                                ruleID: rule.id,
                                category_id: ruleCategoryID,
                                name: ruleName,
                                amount: ruleAmount,
                                rule_type: ruleType,
                                frequency: ruleFrequency,
                                start_date: ruleStartDate,
                                end_date: ruleEndDate,
                                active: ruleActive,
                              });
                              cancelEditRule();
                            } catch (err: any) {
                              Alert.alert("Update failed", err?.message ?? "Unknown error");
                            }
                          }}
                          style={[commonStyles.button, { flex: 1, backgroundColor: colors.accent }]}
                        >
                          <Text style={commonStyles.buttonText}>Save</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                  <View style={[commonStyles.rowBetween, { alignItems: "flex-start" }]}>
                    <View style={{ flex: 1, gap: 3, paddingRight: 12 }}>
                      <View style={[commonStyles.row, { gap: 8, flexWrap: "wrap" }]}>
                        <Text style={[commonStyles.label, { color: colors.text }]}>
                          {rule.name}
                        </Text>

                        <View
                          style={{
                            borderRadius: 999,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            backgroundColor: rule.active ? colors.successSoft : colors.dangerSoft,
                          }}
                        >
                          <Text
                            style={[
                              commonStyles.caption,
                              {
                                color: rule.active ? colors.success : colors.danger,
                                textTransform: "capitalize",
                              },
                            ]}
                          >
                            {rule.active ? "Active" : "Inactive"}
                          </Text>
                        </View>
                      </View>

                      <Text style={[commonStyles.caption, { color: colors.textMuted }]}>
                        {category?.name || "Unknown category"} Â· {rule.frequency} Â· next {rule.next_run_date}
                      </Text>
                    </View>

                    <View style={{ alignItems: "flex-end", gap: 8 }}>
                      <Text
                        style={[
                          commonStyles.money,
                          {
                            color: isExpense ? colors.danger : colors.success,
                            fontSize: 18,
                          },
                        ]}
                      >
                        {isExpense ? "-" : "+"}
                        {formatCents(rule.amount_cents)}
                      </Text>

                      <Pressable
                        onPress={() => beginEditRule(rule)}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: 1,
                          borderColor: colors.border,
                          backgroundColor: colors.accentSoft,
                        }}
                      >
                        <Ionicons name="create-outline" size={18} color={colors.accent} />
                      </Pressable>

                      {rule.active ? (
                        <Pressable
                          onPress={async () => {
                            try {
                              await onRemoveRecurringRule(rule.id);
                            } catch (err: any) {
                              Alert.alert("Update failed", err?.message ?? "Unknown error");
                            }
                          }}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 17,
                            alignItems: "center",
                            justifyContent: "center",
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.warningSoft,
                          }}
                        >
                          <Ionicons name="stop" size={17} color={colors.warning} />
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                  )}
                </View>
              );
            })
          )}
        </Card>

        {onLogout ? (
          <Pressable
            onPress={async () => {
              try {
                await onLogout();
              } catch (err: any) {
                Alert.alert("Logout failed", err?.message ?? "Unknown error");
              }
            }}
            style={[
              commonStyles.secondaryButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.surfaceRaised,
              },
            ]}
          >
            <Text style={[commonStyles.label, { color: colors.text }]}>
              Log Out
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
