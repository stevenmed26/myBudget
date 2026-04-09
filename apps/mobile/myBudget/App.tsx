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
import { createTransaction, fetchCategories, fetchSummary, fetchTransactions } from "./api";
import { Category, Summary, Transaction } from "./types";

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
        }),
        [isDark]
    );

    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<Category[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);

    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
    const [amount, setAmount] = useState("");
    const [merchantName, setMerchantName] = useState("");
    const [note, setNote] = useState("");

    async function loadAll() {
        setLoading(true);
        try {
            const [cats, txs, sum] = await Promise.all([
                fetchCategories(),
                fetchTransactions(),
                fetchSummary(),
            ]);
            setCategories(cats);
            setTransactions(txs);
            setSummary(sum);
            if (!selectedCategoryId && cats.length > 0) {
                setSelectedCategoryId(cats[0].id);
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
                <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: 18,
                        padding: 16,
                    }}
                >
                    <Text style={{ color: colors.subtext, fontSize: 13 }}>Expenses</Text>
                    <Text style={{ color: colors.danger, fontSize: 22, fontWeight: "700", marginTop: 6 }}>
                        {formatCents(summary?.expense_cents ?? 0)}
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
                    <Text style={{ color: colors.success, fontSize: 22, fontWeight: "700", marginTop: 6 }}>
                        {formatCents(summary?.remaining_budget_cents ?? 0)}
                    </Text>
                </View>
            </View>

            <View style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 18,
                padding: 16,
                gap: 12,
            }}
            >
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: "600" }}>
                    Categories
                </Text>

                <FlatList
                    data={categories}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10 }}
                    renderItem={({ item }) => {
                        const selected = item.id === selectedCategoryId;
                        return (
                            <Pressable
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
                    }}
                />
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