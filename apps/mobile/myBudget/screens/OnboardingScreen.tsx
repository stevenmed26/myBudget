import React, { useMemo, useState } from "react";
import { Alert, SafeAreaView, ScrollView, View, Text } from "react-native";
import { Card } from "../components/Card";
import { ActionButton } from "../components/ActionButton";
import { LabeledInput } from "../components/LabeledInput";
import { PillSelector } from "../components/PillSelector";
import { SectionHeader } from "../components/SectionHeader";
import { commonStyles } from "../styles/common";
import { ThemeColors } from "../styles/theme";

type Draft = {
    trackingCadence: "weekly" | "monthly";
    weekStartsOn: number;
    monthlyAnchorDay: number;
    incomeAmount: string;
    incomeCadence: "weekly" | "biweekly" | "monthly" | "yearly";
    locationCode: string;
    estimatedTaxRate: string;
    categoryBudgets: {
        categoryName: string;
        amount: string;
        cadence: "weekly" | "monthly" | "yearly";
    }[];
};

const weekDays = [
    { label: "Sun", value: 0 },
    { label: "Mon", value: 1 },
    { label: "Tue", value: 2 },
    { label: "Wed", value: 3 },
    { label: "Thu", value: 4 },
    { label: "Fri", value: 5 },
    { label: "Sat", value: 6 },
] as const;

export function OnboardingScreen({
    colors,
    onSubmit,
}: {
    colors: ThemeColors;
    onSubmit: (input: {
        tracking_cadence: "weekly" | "monthly";
        week_starts_on: number;
        monthly_anchor_day: number;
        income_amount_cents: number;
        income_cadence: "weekly" | "biweekly" | "monthly" | "yearly";
        location_code: string;
        estimated_tax_rate_bps: number;
        category_budgets: {
        category_name: string;
        amount_cents: number;
        cadence: "weekly" | "monthly" | "yearly";
        }[];
    }) => Promise<void>;
}) {
    const [step, setStep] = useState(0);

    const [draft, setDraft] = useState<Draft>({
        trackingCadence: "weekly",
        weekStartsOn: 1,
        monthlyAnchorDay: 1,
        incomeAmount: "",
        incomeCadence: "monthly",
        locationCode: "US-TX",
        estimatedTaxRate: "",
        categoryBudgets: [
            { categoryName: "Food", amount: "150.00", cadence: "weekly" },
            { categoryName: "Housing", amount: "300.00", cadence: "weekly" },
            { categoryName: "Savings", amount: "100.00", cadence: "weekly" },
            { categoryName: "Tax", amount: "120.00", cadence: "weekly" },
        ],
    });

    const totalSteps = 5;

    const progressLabel = useMemo(() => `Step ${step + 1} of ${totalSteps}`, [step]);

    async function finish() {
        const incomeParsed = Number(draft.incomeAmount);
        const taxParsed = Number(draft.estimatedTaxRate);

        if (Number.isNaN(incomeParsed) || incomeParsed < 0) {
            Alert.alert("Invalid income amount", "Enter a valid income amount.");
            return;
        }

        if (Number.isNaN(taxParsed) || taxParsed < 0 || taxParsed > 100) {
            Alert.alert("Invalid tax rate", "Enter a valid estimated tax rate (0-100%).");
            return;
        }

        const categoryBudgets = [];
        for (const item of draft.categoryBudgets) {
            const parsed = Number(item.amount);
            if (Number.isNaN(parsed) || parsed < 0) {
                Alert.alert("Invalid category budget", `Enter a valid amount for category ${item.categoryName}.`);
                return;
            }

            categoryBudgets.push({
                category_name: item.categoryName,
                amount_cents: Math.round(parsed * 100),
                cadence: item.cadence,
            });
        }

        try {
            await onSubmit({
                tracking_cadence: draft.trackingCadence,
                week_starts_on: draft.weekStartsOn,
                monthly_anchor_day: draft.monthlyAnchorDay,
                income_amount_cents: Math.round(incomeParsed * 100),
                income_cadence: draft.incomeCadence,
                location_code: draft.locationCode.trim() || "US-TX",
                estimated_tax_rate_bps: Math.round(taxParsed * 100),
                category_budgets: categoryBudgets,
            });
        } catch (err: any) {
            Alert.alert("Onboarding failed", err?.message ?? "Unknown error");
        }
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
            <ScrollView contentContainerStyle={commonStyles.screenContent}>
                <View style={{ gap: 6}}>
                    <Text style={[commonStyles.eyebrow, { color: colors.textMuted }]}>{progressLabel}</Text>
                    <Text style={[commonStyles.title, { color: colors.text }]}>Set up your budget</Text>
                </View>

                {step === 0 ? (
                    <Card colors={colors}>
                        <SectionHeader
                            colors={colors}
                            title="Tracking cadence"
                            subtitle="Choose how you want your budget periods to be tracked"
                        />

                        <PillSelector
                            options={["weekly", "monthly"] as const}
                            selected={draft.trackingCadence}
                            onSelect={(value) => setDraft((prev) => ({...prev, trackingCadence: value}))}
                            colors={colors}
                        />

                        {draft.trackingCadence === "weekly" ? (
                            <View style={{ gap: 10 }}>
                                <Text style={[commonStyles.inputLabel, { color: colors.text }]}>Week starts on</Text>
                                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                                    {weekDays.map((day) => {
                                        const selected = draft.weekStartsOn === day.value;
                                        return (
                                            <Text
                                                key={day.value}
                                                onPress={() => setDraft((prev) => ({...prev, weekStartsOn: day.value }))}
                                                style={[
                                                    commonStyles.body,
                                                    {
                                                        paddingVertical: 10,
                                                        paddingHorizontal: 12,
                                                        borderRadius: 999,
                                                        borderWidth: 1,
                                                        borderColor: selected ? colors.accent : colors.border,
                                                        backgroundColor: selected ? colors.accent : colors.surfaceRaised,
                                                        color: selected ? colors.white : colors.text,
                                                    },
                                                ]}
                                            >
                                                {day.label}
                                            </Text>
                                        );
                                    })}
                                </View>
                            </View>
                        ) : (
                            <LabeledInput
                                colors={colors}
                                label="Monthly anchor day"
                                placeholder="1"
                                keyboardType="number-pad"
                                value={String(draft.monthlyAnchorDay)}
                                onChangeText={(value) =>
                                    setDraft((prev) => ({...prev,
                                        monthlyAnchorDay: Math.max(1, Math.min(28, Number(value) || 1)),
                                    }))
                                }
                            />
                        )}
                    </Card>
                ) : null}

                {step === 1 ? (
                    <Card colors={colors}>
                        <SectionHeader
                            colors={colors}
                            title="Income"
                            subtitle="Set your baseline income"
                        />

                        <LabeledInput
                            colors={colors}
                            label="Income amount"
                            placeholder="0.00"
                            keyboardType="decimal-pad"
                            value={draft.incomeAmount}
                            onChangeText={(value) => setDraft((prev) => ({...prev, incomeAmount: value }))}
                        />

                        <View style={{ gap: 10 }}>
                            <Text style={[commonStyles.inputLabel, { color: colors.text }]}>Income cadence</Text>
                            <PillSelector
                                options={["weekly", "biweekly", "monthly", "yearly"] as const}
                                selected={draft.incomeCadence}
                                onSelect={(value) => setDraft((prev) => ({...prev, incomeCadence: value}))}
                                colors={colors}
                            />
                        </View>
                    </Card>
                ) : null}

                {step === 2 ? (
                    <Card colors={colors}>
                        <SectionHeader
                            colors={colors}
                            title="Tax and location"
                            subtitle="You can refine this later in your profile settings"
                        />

                        <LabeledInput
                            colors={colors}
                            label="Location code"
                            placeholder="US-TX"
                            value={draft.locationCode}
                            onChangeText={(value) => setDraft((prev) => ({...prev, locationCode: value}))}
                        />

                        <LabeledInput
                            colors={colors}
                            label="Estimated tax rate (%)"
                            placeholder="0.00"
                            keyboardType="decimal-pad"
                            value={draft.estimatedTaxRate}
                            onChangeText={(value) => setDraft((prev) => ({...prev, estimatedTaxRate: value}))}
                        />
                    </Card>
                ) : null}

                {step === 3 ? (
                    <Card colors={colors}>
                        <SectionHeader
                        colors={colors}
                        title="Default budgets"
                        subtitle="Set starting caps for your main categories"
                        />

                        {draft.categoryBudgets.map((item, index) => (
                        <View key={item.categoryName} style={{ gap: 10 }}>
                            <Text style={[commonStyles.label, { color: colors.text }]}>{item.categoryName}</Text>
                            <LabeledInput
                            colors={colors}
                            label="Amount"
                            placeholder="0.00"
                            keyboardType="decimal-pad"
                            value={item.amount}
                            onChangeText={(value) =>
                                setDraft((prev) => {
                                const copy = [...prev.categoryBudgets];
                                copy[index] = { ...copy[index], amount: value };
                                return { ...prev, categoryBudgets: copy };
                                })
                            }
                            />
                            <PillSelector
                            options={["weekly", "monthly", "yearly"] as const}
                            selected={item.cadence}
                            onSelect={(value) =>
                                setDraft((prev) => {
                                const copy = [...prev.categoryBudgets];
                                copy[index] = { ...copy[index], cadence: value };
                                return { ...prev, categoryBudgets: copy };
                                })
                            }
                            colors={colors}
                            />
                        </View>
                        ))}
                    </Card>
                    ) : null}

                {step === 4 ? (
                    <Card colors={colors}>
                        <SectionHeader
                        colors={colors}
                        title="Review"
                        subtitle="Confirm your setup"
                        />

                        <Text style={[commonStyles.body, { color: colors.text }]}>
                        Tracking: {draft.trackingCadence}
                        </Text>
                        <Text style={[commonStyles.body, { color: colors.text }]}>
                        Income: {draft.incomeAmount || "0.00"} / {draft.incomeCadence}
                        </Text>
                        <Text style={[commonStyles.body, { color: colors.text }]}>
                        Location: {draft.locationCode || "US-TX"}
                        </Text>
                        <Text style={[commonStyles.body, { color: colors.text }]}>
                        Tax rate: {draft.estimatedTaxRate || "0.00"}%
                        </Text>

                        <View style={{ gap: 6 }}>
                        {draft.categoryBudgets.map((item) => (
                            <Text key={item.categoryName} style={[commonStyles.body, { color: colors.textMuted }]}>
                            {item.categoryName}: {item.amount || "0.00"} / {item.cadence}
                            </Text>
                        ))}
                        </View>
                    </Card>
                    ) : null}

                    <View style={{ flexDirection: "row", gap: 12 }}>
                        {step > 0 ? (
                            <View style={{ flex: 1 }}>
                                <ActionButton
                                    label="Back"
                                    colors={colors}
                                    onPress={() => setStep((prev) => Math.max(0, prev - 1))}
                                />
                            </View>
                        ) : null}

                        <View style={{ flex: 1 }}>
                            {step < totalSteps - 1 ? (
                                <ActionButton
                                    label="Next"
                                    colors={colors}
                                    onPress={() => setStep((prev) => Math.min(totalSteps - 1, prev + 1))}
                                />                           
                            ) : (
                                <ActionButton
                                    label="Finish Setup"
                                    colors={colors}
                                    onPress={finish}
                                />    
                            )}
                        </View>
                    </View>
            </ScrollView>
        </SafeAreaView>
    )
}