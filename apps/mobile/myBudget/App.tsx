import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    useColorScheme,
    View,
} from "react-native";
import { 
    createTransaction,
    fetchCategories,
    fetchSummary,
    fetchTransactions,
    fetchHomeSummary,
    fetchProfile,
    updateProfile,
} from "./api";
import { Category, Summary, Transaction, HomeSummary, BudgetProfile } from "./types";

function formatCents(cents: number) {
    const sign = cents < 0 ? "-" : "";
    const abs = Math.abs(cents);
    return `${sign}$${(abs / 100).toFixed(2)}`;
}

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

export default function App() {
    const scheme = useColorScheme();
    const isDark = scheme === "dark";

    const colors = useMemo(
        () => ({
            bg: isDark? "#0B1220" : "#F8FAFC",
            card: isDark? "#111827" : "#FFFFFF",
            border: isDark? "#1F2937" : "#E5E7EB",
            text: isDark? "#F9FAFB" : "#111827",
            subtext: isDark? "#9CA3AF" : "#6B7280",
            accent: "#2563EB",
            danger: "#DC2626",
            success: "#16A34A",
            warning: "#D97706",
        }),
        [isDark]
    );

    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<Category[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [homeSummary, setHomeSummary] = useState<HomeSummary | null>(null);
    const [profile, setProfile] = useState<BudgetProfile | null>(null);
    const [summary, setSummary] = useState<Summary | null>(null);

    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
    const [amount, setAmount] = useState("");
    const [merchantName, setMerchantName] = useState("");
    const [note, setNote] = useState("");

    const [incomeAmount, setIncomeAmount] = useState("");
    const [estimatedTaxRate, setEstimatedTaxRate] = useState("");
    const [trackingCadence, setTrackingCadence] = useState<"weekly" | "monthly">("weekly");

    async function loadAll() {
        setLoading(true);
        try {
            const [cats, txs, home, prof] = await Promise.all([
                fetchCategories(),
                fetchTransactions(),
                fetchHomeSummary(),
                fetchProfile(),
            ]);

            setCategories(cats);
            setTransactions(txs);
            setHomeSummary(home);
            setProfile(prof);

            setIncomeAmount((prof.income_amount_cents / 100).toFixed(2));
            setEstimatedTaxRate((prof.estimated_tax_rate_bps / 100).toFixed(2));
            setTrackingCadence(prof.tracking_cadence);

            if (!selectedCategoryId && cats.length > 0) {
                const firstBudgetable = cats.find((c) => !c.is_system) ?? cats[0];
                setSelectedCategoryId(firstBudgetable.id);
            }
        } catch (err: any) {
            Alert.alert("Load failed", err?.message ?? "Unknown error");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadAll();
    }, []);

    async function handleAddExpense() {
        const parsed = Number(amount);
        if (!selectedCategoryId) {
            Alert.alert("Missing category", "Choose a category first.");
            return;
        }
        if (!parsed || parsed <= 0) {
            Alert.alert("Invalid amount", "Enter a positive amount.");
            return;
        }

        try {
            await createTransaction({
                category_id: selectedCategoryId,
                amount_cents: Math.round(parsed * 100),
                transaction_type: "expense",
                transaction_date: todayISO(),
                merchant_name: merchantName || undefined,
                note: note || undefined,
            });

            setAmount("");
            setMerchantName("");
            setNote("");
            await loadAll();
        } catch (err: any) {
            Alert.alert("Create failed", err?.message ?? "Unknown error");
        }
    }

    async function handleSaveProfile() {
        if (!profile) return;

        const incomeParsed = Number(incomeAmount);
        const taxRateParsed = Number(estimatedTaxRate);

        if (Number.isNaN(incomeParsed) || incomeParsed < 0) {
            Alert.alert("Invalid income", "Income must be zero or greater.");
            return;
        }
        if (Number.isNaN(taxRateParsed) || taxRateParsed < 0 || taxRateParsed > 100) {
            Alert.alert("Invalid tax rate", "Tax rate must be between 0 and 100.");
            return;
        }

        try {
            const updated = await updateProfile({
                tracking_cadence: trackingCadence,
                week_starts_on: profile.week_starts_on,
                monthly_anchor_day: profile.monthly_anchor_day,
                currency_code: profile.currency_code,
                locale: profile.locale,
                timezone: profile.timezone,
                income_amount_cents: Math.round(incomeParsed * 100),
                income_cadence: profile.income_cadence,
                location_code: profile.location_code,
                estimated_tax_rate_bps: Math.round(taxRateParsed * 100),
            });

            setProfile(updated);
            await loadAll();
            Alert.alert("Saved", "Budget profile updated.");
        } catch (err: any) {
            Alert.alert("Save failed", err?.message ?? "Unknown error");
        }
    }

    function renderProgressBar(percentUsed: number, color: string) {
        const capped = Math.max(0, Math.min(100, percentUsed));

        return (
            <View
                style={{
                    height: 10,
                    backgroundColor: colors.border,
                    borderRadius: 999,
                    overflow: "hidden",
                }}
            >
                <View
                    style={{
                        width: `${capped}%`,
                        height: "100%",
                        backgroundColor: color,
                    }}
                />
            </View>
        );
    }

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator size="large" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <ScrollView contentContainerStyle={{ padding: 16 }}>
                <Text style={{ color: colors.text, fontSize: 28, fontWeight: "700" }}>
                    myBudget
                </Text>

                <View
                    style={{
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: 18,
                        padding: 16,
                        gap: 8,
                    }}
                >
                    <Text style={{ color: colors.subtext, fontSize: 13 }}>Current Period</Text>
                    <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700" }}>
                        {homeSummary?.period_start} - {homeSummary?.period_end}
                    </Text>
                    <Text style={{ color: colors.subtext }}>
                        Tracking cadence: {homeSummary?.tracking_cadence}
                    </Text>
                </View>
                
                <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: 18,
                        padding: 16,
                    }}
                >
                    <Text style={{ color: colors.subtext, fontSize: 13 }}>Budget</Text>
                    <Text style={{ color: colors.danger, fontSize: 22, fontWeight: "700", marginTop: 6 }}>
                        {formatCents(homeSummary?.net_income_budget_cents ?? 0)}
                    </Text>
                </View>

                <View
                    style={{
                        flex: 1,
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: 18,
                        padding: 16,
                    }}
                >
                    <Text style={{ color: colors.subtext, fontSize: 13 }}>Spent</Text>
                    <Text style={{ color: colors.danger, fontSize: 22, fontWeight: "700", marginTop: 6 }}>
                        {formatCents(homeSummary?.spent_amount_cents ?? 0)}
                    </Text>
                </View>

                <View
                    style={{
                        flex: 1,
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: 18,
                        padding: 16,
                    }}
                >
                    <Text style={{ color: colors.subtext, fontSize: 13 }}>Remaining</Text>
                    <Text style={{
                        color: (homeSummary?.remaining_amount_cents ?? 0) < 0 ? colors.danger : colors.success,
                        fontSize: 26,
                        fontWeight: "700",
                        marginTop: 6,
                        }}
                    >
                        {formatCents(homeSummary?.remaining_amount_cents ?? 0)}
                    </Text>
                </View>

                <View
                    style={{
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: 18,
                        padding: 16,
                        gap: 12,
                    }}
                >
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
                        Budget Setup
                    </Text>

                    <TextInput
                        placeholder="Income amount"
                        placeholderTextColor={colors.subtext}
                        keyboardType="decimal-pad"
                        value={incomeAmount}
                        onChangeText={setIncomeAmount}
                        style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 12,
                            color: colors.text,
                        }}
                    />

                    <TextInput
                        placeholder= "Estimated tax rate (%)"
                        placeholderTextColor= {colors.subtext}
                        keyboardType= "decimal-pad"
                        value= {estimatedTaxRate}
                        onChangeText= {setEstimatedTaxRate}
                        style= {{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 12,
                            color: colors.text,
                        }}
                    />

                    <View style={{ flexDirection: "row", gap: 10 }}>
                        {(["weekly", "monthly"] as const).map((cadence) => {
                            const selected = trackingCadence === cadence;
                            return (
                                <Pressable
                                    key={cadence}
                                    onPress={() => setTrackingCadence(cadence)}
                                    style={{
                                        paddingVertical: 10,
                                        paddingHorizontal: 14,
                                        borderRadius: 999,
                                        borderWidth: 1,
                                        borderColor: selected ? colors.accent : colors.border,
                                        backgroundColor: selected ? colors.accent : colors.card,
                                    }}
                                >
                                    <Text style={{ color: selected ? "#FFFFFF" : colors.text, fontWeight: "600" }}>
                                        {cadence}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    <Pressable
                        onPress={handleSaveProfile}
                        style={{
                            backgroundColor: colors.accent,
                            borderRadius: 14,
                            paddingVertical: 14,
                            alignItems: "center",
                        }}
                    >
                        <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>
                            Save Budget Settings
                        </Text>
                    </Pressable>
                </View>
            </View>

            <View 
                style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 18,
                    padding: 16,
                    gap: 12,
                }}
            >
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
                    Category Progress
                </Text>
                {homeSummary?.category_progress_items.map((item) => {
                    const over = item.remaining_amount_cents < 0;
                    return (
                        <View
                            key={item.category_id}
                            style={{
                                borderTopWidth: 1,
                                borderTopColor: colors.border,
                                paddingTop: 12,
                                gap: 8,
                            }}
                        >
                            <View
                                style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>
                                    {item.category_name}
                                </Text>
                                <Text
                                    style={{
                                        color: over ? colors.danger : colors.success,
                                        fontWeight: "700",
                                    }}
                                >
                                    {item.percent_used}%
                                </Text>
                            </View>

                            {renderProgressBar(item.percent_used, item.category_color)}


                            <View
                                style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                }}
                            >
                                <Text style={{ color: colors.subtext }}>
                                    Spent {formatCents(item.spent_amount_cents)}
                                </Text>
                                <Text style={{ color: colors.subtext }}>
                                    Budget {formatCents(item.budget_amount_cents)}
                                </Text>
                            </View>

                            <Text
                                style={{
                                    color: over ? colors.danger : colors.success,
                                    fontWeight: "600",
                                }}
                            >
                                Remaining {formatCents(item.remaining_amount_cents)}
                            </Text>
                        </View>
                    );
                })}
            </View>
            
            <View
                style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 18,
                    padding: 16,
                    gap: 12,
                }}
            >
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
                    Quick Add Expense
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {categories
                        .filter((c) => c.counts_toward_budget)
                        .map((item) => {
                            const selected = item.id === selectedCategoryId;
                            return (
                                <Pressable
                                    key={item.id}
                                    onPress={() => setSelectedCategoryId(item.id)}
                                    style={{
                                        paddingVertical: 10,
                                        paddingHorizontal: 14,
                                        borderRadius: 999,
                                        borderWidth: 1,
                                        borderColor: selected ? item.color : colors.border,
                                        backgroundColor: selected ? item.color : colors.card,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: selected ? "#FFFFFF" : colors.text,
                                            fontWeight: "600",
                                        }}
                                    >
                                        {item.name}
                                    </Text>
                                </Pressable>
                            );
                        })}
                </ScrollView>
                <TextInput
                    placeholder="Amount in dollars"
                    placeholderTextColor={colors.subtext}
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={setAmount}
                    style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        color: colors.text,
                    }}
                />

                <TextInput
                    placeholder="Merchant name (optional)"
                    placeholderTextColor={colors.subtext}
                    value={merchantName}
                    onChangeText={setMerchantName}
                    style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        color: colors.text,
                    }}
                />

                <TextInput
                    placeholder="Note (optional)"
                    placeholderTextColor={colors.subtext}
                    value={note}
                    onChangeText={setNote}
                    style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        color: colors.text,
                    }}
                />

                <Pressable
                    onPress={handleAddExpense}
                    style={{
                        backgroundColor: colors.accent,
                        borderRadius: 14,
                        paddingVertical: 14,
                        alignItems: "center",
                    }}
                >
                    <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>
                        Add Expense
                    </Text>
                </Pressable>
            </View>

            <View
                style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 18,
                    padding: 16,
                    gap: 12,
                }}
            >
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
                    Recent Transactions
                </Text>

                {transactions.length === 0 ? (
                    <Text style={{ color: colors.subtext }}>No transactions yet.</Text>
                ) : (
                    transactions.map((item) => {
                        const category = categories.find((c) => c.id === item.category_id);
                        return (
                            <View
                                key={item.id}
                                style={{
                                    borderTopWidth: 1,
                                    borderTopColor: colors.border,
                                    paddingTop: 12,
                                    gap: 4,
                                }}
                            >
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                    }}
                                >
                                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>
                                        {item.merchant_name || category?.name || "Transaction"}
                                    </Text>
                                    <Text 
                                        style={{
                                            color: item.transaction_type === "expense" ? colors.danger : colors.success,
                                            fontSize: 16,
                                            fontWeight: "700",
                                        }}
                                    >
                                        {item.transaction_type === "expense" ? "-" : "+"}
                                        {formatCents(item.amount_cents)}
                                    </Text>
                                </View>

                                <Text style={{ color: colors.subtext }}>
                                    {category?.name || "Unknown category"} • {item.transaction_date}
                                </Text>

                                {item.note ? <Text style={{ color: colors.subtext }}>{item.note}</Text> : null}
                            </View>
                        );
                    })
                )}
            </View>
            </ScrollView>
        </SafeAreaView>
    );
}