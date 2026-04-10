import React, { useEffect, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, Text, TextInput } from "react-native";
import { Card } from "../components/Card";
import { PillSelector } from "../components/PillSelector";
import { commonStyles } from "../styles/common";
import { ThemeColors } from "../styles/theme";
import { BudgetProfile } from "../types";

export function ProfileScreen({
  colors,
  profile,
  onSaveProfile,
}: {
  colors: ThemeColors;
  profile: BudgetProfile | null;
  onSaveProfile: (input: {
    incomeAmount: string;
    taxRate: string;
    trackingCadence: "weekly" | "monthly";
  }) => Promise<void>;
}) {
  const [incomeAmount, setIncomeAmount] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [trackingCadence, setTrackingCadence] = useState<"weekly" | "monthly">("weekly");

  useEffect(() => {
    if (!profile) return;
    setIncomeAmount((profile.income_amount_cents / 100).toFixed(2));
    setTaxRate((profile.estimated_tax_rate_bps / 100).toFixed(2));
    setTrackingCadence(profile.tracking_cadence);
  }, [profile]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={commonStyles.screenContent}>
        <Text style={[commonStyles.title, { color: colors.text }]}>Profile</Text>

        <Card colors={colors}>
          <Text style={[commonStyles.sectionTitle, { color: colors.text }]}>Budget Setup</Text>

          <TextInput
            placeholder="Income amount"
            placeholderTextColor={colors.subtext}
            keyboardType="decimal-pad"
            value={incomeAmount}
            onChangeText={setIncomeAmount}
            style={[commonStyles.input, { borderColor: colors.border, color: colors.text }]}
          />

          <TextInput
            placeholder="Estimated tax rate %"
            placeholderTextColor={colors.subtext}
            keyboardType="decimal-pad"
            value={taxRate}
            onChangeText={setTaxRate}
            style={[commonStyles.input, { borderColor: colors.border, color: colors.text }]}
          />

          <PillSelector
            options={["weekly", "monthly"] as const}
            selected={trackingCadence}
            onSelect={setTrackingCadence}
            colors={colors}
          />

          <Pressable
            onPress={async () => {
              try {
                await onSaveProfile({ incomeAmount, taxRate, trackingCadence });
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
      </ScrollView>
    </SafeAreaView>
  );
}