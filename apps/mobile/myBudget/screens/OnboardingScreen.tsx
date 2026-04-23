import React, { useMemo, useState } from "react";
import { Alert, SafeAreaView, ScrollView, View, Text } from "react-native";
import { Card } from "../components/Card";
import { ActionButton } from "../components/ActionButton";
import { CalendarMonthPicker } from "../components/CalendarMonthPicker";
import { LabeledInput } from "../components/LabeledInput";
import { PillSelector } from "../components/PillSelector";
import { SectionHeader } from "../components/SectionHeader";
import { ToggleRow } from "../components/ToggleRow";
import { WeekStartPicker } from "../components/WeekStartPicker";
import { requestLocationCode } from "../lib/location";
import { commonStyles } from "../styles/common";
import { ThemeColors } from "../styles/theme";

type Draft = {
    trackingCadence: "weekly" | "monthly";
    weekStartsOn: number;
    monthlyAnchorDay: number;
    incomeAmount: string;
    incomeCadence: "weekly" | "biweekly" | "monthly" | "yearly";
    locationCode: string;
    smartBudgetingEnabled: boolean;
    categoryBudgets: {
        categoryName: string;
        amount: string;
        cadence: "weekly" | "monthly" | "yearly";
    }[];
};

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
        smart_budgeting_enabled: boolean;
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
        smartBudgetingEnabled: true,
        categoryBudgets: [
            { categoryName: "Food", amount: "150.00", cadence: "weekly" },
            { categoryName: "Housing", amount: "300.00", cadence: "weekly" },
            { categoryName: "Savings", amount: "100.00", cadence: "weekly" },
        ],
    });

    const totalSteps = 5;

    const progressLabel = useMemo(() => `Step ${step + 1} of ${totalSteps}`, [step]);

    async function finish() {
        const incomeParsed = Number(draft.incomeAmount);

        if (Number.isNaN(incomeParsed) || incomeParsed < 0) {
            Alert.alert("Invalid income amount", "Enter a valid income amount.");
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
                estimated_tax_rate_bps: 0,
                smart_budgeting_enabled: draft.smartBudgetingEnabled,
                category_budgets: categoryBudgets,
            });
        } catch (err: any) {
            Alert.alert("Onboarding failed", err?.message ?? "Unknown error");
        }
    }

    async function useCurrentLocation() {
        try {
            const nextLocationCode = await requestLocationCode();
            setDraft((prev) => ({ ...prev, locationCode: nextLocationCode }));
        } catch (err: any) {
            Alert.alert("Location unavailable", err?.message ?? "Unable to determine your tax location.");
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
                            <WeekStartPicker
                                colors={colors}
                                value={draft.weekStartsOn}
                                onChange={(value) =>
                                    setDraft((prev) => ({ ...prev, weekStartsOn: value }))
                                }
                            />
                        ) : (
                            <CalendarMonthPicker
                                colors={colors}
                                label="Monthly anchor day"
                                selectedDate=""
                                selectedDay={draft.monthlyAnchorDay}
                                maxDay={28}
                                onSelectDate={(value) =>
                                    setDraft((prev) => ({
                                        ...prev,
                                        monthlyAnchorDay: Number(value.slice(8, 10)),
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
                            title="Withholding and location"
                            subtitle="Allow location access to estimate federal, state, Social Security, and Medicare withholding"
                        />

                        <View
                            style={{
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: 16,
                                padding: 14,
                                gap: 6,
                                backgroundColor: colors.surfaceRaised,
                            }}
                        >
                            <Text style={[commonStyles.inputLabel, { color: colors.text }]}>Withholding location</Text>
                            <Text style={[commonStyles.body, { color: colors.text }]}>{draft.locationCode}</Text>
                            <Text style={[commonStyles.caption, { color: colors.textMuted }]}>
                                We use this to create recurring estimated tax transactions based on your tracking cadence.
                            </Text>
                        </View>

                        <ActionButton
                            label="Use My Location"
                            colors={colors}
                            onPress={useCurrentLocation}
                        />

                        <ToggleRow
                            colors={colors}
                            title="Smart budgeting"
                            subtitle="Show high-confidence budget recommendations"
                            enabled={draft.smartBudgetingEnabled}
                            onToggle={() =>
                                setDraft((prev) => ({
                                    ...prev,
                                    smartBudgetingEnabled: !prev.smartBudgetingEnabled,
                                }))
                            }
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
                        Withholding estimate: automatic
                        </Text>
                        <Text style={[commonStyles.body, { color: colors.text }]}>
                        Smart budgeting: {draft.smartBudgetingEnabled ? "On" : "Off"}
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
