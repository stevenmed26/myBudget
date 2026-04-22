import React, { useEffect, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../components/Card";
import { LabeledInput } from "../components/LabeledInput";
import { PillSelector } from "../components/PillSelector";
import { SectionHeader } from "../components/SectionHeader";
import { ToggleRow } from "../components/ToggleRow";
import { commonStyles } from "../styles/common";
import { ThemeColors } from "../styles/theme";
import { BudgetProfile, Category, RecurringRule } from "../types";
import { formatCents } from "../lib/format";

export function ProfileScreen({
  colors,
  profile,
  categories,
  recurringRules,
  onSaveProfile,
  onRemoveRecurringRule,
  onLogout,
}: {
  colors: ThemeColors;
  profile: BudgetProfile | null;
  categories: Category[];
  recurringRules: RecurringRule[];
  onSaveProfile: (input: {
    incomeAmount: string;
    taxRate: string;
    trackingCadence: "weekly" | "monthly";
    smartBudgetingEnabled: boolean;
  }) => Promise<void>;
  onRemoveRecurringRule: (ruleID: string) => Promise<void>;
  onLogout?: () => Promise<void>;
}) {
  const [incomeAmount, setIncomeAmount] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [trackingCadence, setTrackingCadence] = useState<"weekly" | "monthly">("weekly");
  const [smartBudgetingEnabled, setSmartBudgetingEnabled] = useState(true);

  useEffect(() => {
    if (!profile) return;
    setIncomeAmount((profile.income_amount_cents / 100).toFixed(2));
    setTaxRate((profile.estimated_tax_rate_bps / 100).toFixed(2));
    setTrackingCadence(profile.tracking_cadence);
    setSmartBudgetingEnabled(profile.smart_budgeting_enabled);
  }, [profile]);

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

          <LabeledInput
            colors={colors}
            label="Estimated tax rate (%)"
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={taxRate}
            onChangeText={setTaxRate}
          />

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
                  taxRate,
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
