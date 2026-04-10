import React, { useEffect, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Card } from "../components/Card";
import { LabeledInput } from "../components/LabeledInput";
import { PillSelector } from "../components/PillSelector";
import { SectionHeader } from "../components/SectionHeader";
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