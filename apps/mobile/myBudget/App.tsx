import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  closeCurrentPeriod,
  createTransaction,
  deleteTransaction,
  fetchCategories,
  fetchCategoryBudgets,
  fetchHomeSummary,
  fetchProfile,
  fetchTransactions,
  updateProfile,
  upsertCategoryBudget,
} from "./api";
import {
  BudgetProfile,
  Category,
  CategoryBudget,
  HomeSummary,
  Transaction,
} from "./types";

const Tab = createBottomTabNavigator();

function formatCents(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toFixed(2)}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

type ThemeColors = {
  bg: string;
  card: string;
  border: string;
  text: string;
  subtext: string;
  accent: string;
  danger: string;
  success: string;
};

function useAppColors(): ThemeColors {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  return useMemo(
    () => ({
      bg: isDark ? "#0B1220" : "#F8FAFC",
      card: isDark ? "#111827" : "#FFFFFF",
      border: isDark ? "#1F2937" : "#E5E7EB",
      text: isDark ? "#F9FAFB" : "#111827",
      subtext: isDark ? "#9CA3AF" : "#6B7280",
      accent: "#2563EB",
      danger: "#DC2626",
      success: "#16A34A",
    }),
    [isDark]
  );
}

function Screen({ colors, children }: { colors: ThemeColors; children: React.ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={useColorScheme() === "dark" ? "light-content" : "dark-content"} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>{children}</ScrollView>
    </SafeAreaView>
  );
}

function HomeTab({
  colors,
  homeSummary,
  onRefresh,
  onClosePeriod,
}: {
  colors: ThemeColors;
  homeSummary: HomeSummary | null;
  onRefresh: () => Promise<void>;
  onClosePeriod: () => Promise<void>;
}) {
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
        <View style={{ width: `${capped}%`, height: "100%", backgroundColor: color }} />
      </View>
    );
  }

  return (
    <Screen colors={colors}>
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: "700" }}>myBudget</Text>

      <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 16, gap: 8 }}>
        <Text style={{ color: colors.subtext, fontSize: 13 }}>Current Period</Text>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>
          {homeSummary?.period_start} - {homeSummary?.period_end}
        </Text>
        <Text style={{ color: colors.subtext }}>Tracking cadence: {homeSummary?.tracking_cadence}</Text>
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 16 }}>
          <Text style={{ color: colors.subtext }}>Budget</Text>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700", marginTop: 6 }}>
            {formatCents(homeSummary?.net_income_budget_cents ?? 0)}
          </Text>
        </View>
        <View style={{ flex: 1, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 16 }}>
          <Text style={{ color: colors.subtext }}>Spent</Text>
          <Text style={{ color: colors.danger, fontSize: 22, fontWeight: "700", marginTop: 6 }}>
            {formatCents(homeSummary?.spent_amount_cents ?? 0)}
          </Text>
        </View>
      </View>

      <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 16 }}>
        <Text style={{ color: colors.subtext }}>Remaining</Text>
        <Text
          style={{
            color: (homeSummary?.remaining_amount_cents ?? 0) < 0 ? colors.danger : colors.success,
            fontSize: 26,
            fontWeight: "700",
            marginTop: 6,
          }}
        >
          {formatCents(homeSummary?.remaining_amount_cents ?? 0)}
        </Text>
      </View>

      <Pressable
        onPress={onClosePeriod}
        style={{ backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
      >
        <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>Close Current Period</Text>
      </Pressable>

      <Pressable
        onPress={onRefresh}
        style={{ borderRadius: 14, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: colors.border }}
      >
        <Text style={{ color: colors.text, fontWeight: "700" }}>Refresh</Text>
      </Pressable>

      <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>Category Progress</Text>
        {homeSummary?.category_progress_items.map((item) => {
          const over = item.remaining_amount_cents < 0;
          return (
            <View key={item.category_id} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, gap: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>{item.category_name}</Text>
                <Text style={{ color: over ? colors.danger : colors.subtext, fontWeight: "700" }}>{item.percent_used}%</Text>
              </View>
              {renderProgressBar(item.percent_used, item.category_color)}
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: colors.subtext }}>Spent {formatCents(item.spent_amount_cents)}</Text>
                <Text style={{ color: colors.subtext }}>Budget {formatCents(item.budget_amount_cents)}</Text>
              </View>
              <Text style={{ color: over ? colors.danger : colors.success, fontWeight: "600" }}>
                Remaining {formatCents(item.remaining_amount_cents)}
              </Text>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

function TransactionsTab({
  colors,
  categories,
  transactions,
  onAddExpense,
  onDeleteTransaction,
}: {
  colors: ThemeColors;
  categories: Category[];
  transactions: Transaction[];
  onAddExpense: (input: { category_id: string; amount: string; merchant_name: string; note: string }) => Promise<void>;
  onDeleteTransaction: (transactionID: string) => Promise<void>;
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      const firstBudgetable = categories.find((c) => c.counts_toward_budget) ?? categories[0];
      setSelectedCategoryId(firstBudgetable.id);
    }
  }, [categories, selectedCategoryId]);

  return (
    <Screen colors={colors}>
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: "700" }}>Transactions</Text>

      <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>Quick Add Expense</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {categories.filter((c) => c.counts_toward_budget).map((item) => {
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
                  <Text style={{ color: selected ? "#FFFFFF" : colors.text, fontWeight: "600" }}>{item.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <TextInput
          placeholder="Amount in dollars"
          placeholderTextColor={colors.subtext}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, color: colors.text }}
        />

        <TextInput
          placeholder="Merchant name (optional)"
          placeholderTextColor={colors.subtext}
          value={merchantName}
          onChangeText={setMerchantName}
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, color: colors.text }}
        />

        <TextInput
          placeholder="Note (optional)"
          placeholderTextColor={colors.subtext}
          value={note}
          onChangeText={setNote}
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, color: colors.text }}
        />

        <Pressable
          onPress={async () => {
            await onAddExpense({
              category_id: selectedCategoryId,
              amount,
              merchant_name: merchantName,
              note,
            });
            setAmount("");
            setMerchantName("");
            setNote("");
          }}
          style={{ backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>Add Expense</Text>
        </Pressable>
      </View>

      <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>Recent Transactions</Text>

        {transactions.map((item) => {
          const category = categories.find((c) => c.id === item.category_id);
          return (
            <View key={item.id} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, gap: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>
                  {item.merchant_name || category?.name || "Transaction"}
                </Text>
                <Text style={{ color: item.transaction_type === "expense" ? colors.danger : colors.success, fontWeight: "700" }}>
                  {item.transaction_type === "expense" ? "-" : "+"}
                  {formatCents(item.amount_cents)}
                </Text>
              </View>

              <Text style={{ color: colors.subtext }}>
                {category?.name || "Unknown category"} · {item.transaction_date}
              </Text>

              {item.note ? <Text style={{ color: colors.subtext }}>{item.note}</Text> : null}

              <Pressable
                onPress={() => onDeleteTransaction(item.id)}
                style={{ alignSelf: "flex-start", borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 }}
              >
                <Text style={{ color: colors.text, fontWeight: "600" }}>Delete</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

function CategoriesTab({
  colors,
  budgets,
  onSaveBudget,
}: {
  colors: ThemeColors;
  budgets: CategoryBudget[];
  onSaveBudget: (categoryID: string, amount: string, cadence: "weekly" | "monthly" | "yearly") => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [cadences, setCadences] = useState<Record<string, "weekly" | "monthly" | "yearly">>({});

  useEffect(() => {
    const nextDrafts: Record<string, string> = {};
    const nextCadences: Record<string, "weekly" | "monthly" | "yearly"> = {};
    for (const item of budgets) {
      nextDrafts[item.category_id] = (item.amount_cents / 100).toFixed(2);
      nextCadences[item.category_id] = item.cadence;
    }
    setDrafts(nextDrafts);
    setCadences(nextCadences);
  }, [budgets]);

  return (
    <Screen colors={colors}>
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: "700" }}>Categories</Text>

      <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>Budget Caps</Text>

        {budgets.map((item) => (
          <View key={item.category_id} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, gap: 10 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>{item.category_name}</Text>

            <TextInput
              placeholder="Budget amount"
              placeholderTextColor={colors.subtext}
              keyboardType="decimal-pad"
              value={drafts[item.category_id] ?? ""}
              onChangeText={(value) => setDrafts((prev) => ({ ...prev, [item.category_id]: value }))}
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, color: colors.text }}
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              {(["weekly", "monthly", "yearly"] as const).map((cadence) => {
                const selected = (cadences[item.category_id] ?? item.cadence) === cadence;
                return (
                  <Pressable
                    key={cadence}
                    onPress={() => setCadences((prev) => ({ ...prev, [item.category_id]: cadence }))}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: selected ? item.category_color : colors.border,
                      backgroundColor: selected ? item.category_color : colors.card,
                    }}
                  >
                    <Text style={{ color: selected ? "#FFFFFF" : colors.text, fontWeight: "600" }}>{cadence}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => onSaveBudget(item.category_id, drafts[item.category_id] ?? "0", cadences[item.category_id] ?? item.cadence)}
              style={{ alignSelf: "flex-start", backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Save Budget</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </Screen>
  );
}

function ProfileTab({
  colors,
  profile,
  onSaveProfile,
}: {
  colors: ThemeColors;
  profile: BudgetProfile | null;
  onSaveProfile: (input: { incomeAmount: string; taxRate: string; trackingCadence: "weekly" | "monthly" }) => Promise<void>;
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
    <Screen colors={colors}>
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: "700" }}>Profile</Text>

      <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>Budget Setup</Text>

        <TextInput
          placeholder="Income amount"
          placeholderTextColor={colors.subtext}
          keyboardType="decimal-pad"
          value={incomeAmount}
          onChangeText={setIncomeAmount}
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, color: colors.text }}
        />

        <TextInput
          placeholder="Estimated tax rate %"
          placeholderTextColor={colors.subtext}
          keyboardType="decimal-pad"
          value={taxRate}
          onChangeText={setTaxRate}
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, color: colors.text }}
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
                <Text style={{ color: selected ? "#FFFFFF" : colors.text, fontWeight: "600" }}>{cadence}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => onSaveProfile({ incomeAmount, taxRate, trackingCadence })}
          style={{ backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>Save Profile</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

export default function App() {
  const colors = useAppColors();

  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [homeSummary, setHomeSummary] = useState<HomeSummary | null>(null);
  const [profile, setProfile] = useState<BudgetProfile | null>(null);

  const loadAll = useCallback(async () => {
    const [cats, txs, home, prof, budgetItems] = await Promise.all([
      fetchCategories(),
      fetchTransactions(),
      fetchHomeSummary(),
      fetchProfile(),
      fetchCategoryBudgets(),
    ]);
    setCategories(cats);
    setTransactions(txs);
    setHomeSummary(home);
    setProfile(prof);
    setBudgets(budgetItems);
  }, []);

  useEffect(() => {
    loadAll().catch((err) => Alert.alert("Load failed", err?.message ?? "Unknown error"));
  }, [loadAll]);

  async function handleAddExpense(input: {
    category_id: string;
    amount: string;
    merchant_name: string;
    note: string;
  }) {
    const parsed = Number(input.amount);
    if (!input.category_id) {
      Alert.alert("Missing category", "Choose a category first.");
      return;
    }
    if (!parsed || parsed <= 0) {
      Alert.alert("Invalid amount", "Enter a positive amount.");
      return;
    }

    await createTransaction({
      category_id: input.category_id,
      amount_cents: Math.round(parsed * 100),
      transaction_type: "expense",
      transaction_date: todayISO(),
      merchant_name: input.merchant_name || undefined,
      note: input.note || undefined,
    });

    await loadAll();
  }

  async function handleDeleteTransaction(transactionID: string) {
    await deleteTransaction(transactionID);
    await loadAll();
  }

  async function handleSaveBudget(
    categoryID: string,
    amount: string,
    cadence: "weekly" | "monthly" | "yearly"
  ) {
    const parsed = Number(amount);
    if (Number.isNaN(parsed) || parsed < 0) {
      Alert.alert("Invalid amount", "Budget must be zero or greater.");
      return;
    }

    await upsertCategoryBudget({
      category_id: categoryID,
      amount_cents: Math.round(parsed * 100),
      cadence,
      effective_from: todayISO(),
    });

    await loadAll();
    Alert.alert("Saved", "Category budget updated.");
  }

  async function handleSaveProfile(input: {
    incomeAmount: string;
    taxRate: string;
    trackingCadence: "weekly" | "monthly";
  }) {
    if (!profile) return;

    const incomeParsed = Number(input.incomeAmount);
    const taxParsed = Number(input.taxRate);

    if (Number.isNaN(incomeParsed) || incomeParsed < 0) {
      Alert.alert("Invalid income", "Income must be zero or greater.");
      return;
    }
    if (Number.isNaN(taxParsed) || taxParsed < 0 || taxParsed > 100) {
      Alert.alert("Invalid tax rate", "Tax rate must be between 0 and 100.");
      return;
    }

    await updateProfile({
      tracking_cadence: input.trackingCadence,
      week_starts_on: profile.week_starts_on,
      monthly_anchor_day: profile.monthly_anchor_day,
      currency_code: profile.currency_code,
      locale: profile.locale,
      timezone: profile.timezone,
      income_amount_cents: Math.round(incomeParsed * 100),
      income_cadence: profile.income_cadence,
      location_code: profile.location_code,
      estimated_tax_rate_bps: Math.round(taxParsed * 100),
    });

    await loadAll();
    Alert.alert("Saved", "Budget profile updated.");
  }

  async function handleClosePeriod() {
    const result = await closeCurrentPeriod();
    await loadAll();

    if (result.already_closed) {
      Alert.alert("Already closed", `This period was already closed.\nLeftover: ${formatCents(result.leftover_amount_cents)}`);
      return;
    }

    Alert.alert(
      "Period closed",
      `Leftover moved to Saved: ${formatCents(Math.max(0, result.leftover_amount_cents))}`
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.subtext,
        }}
      >
        <Tab.Screen name="Home">
          {() => (
            <HomeTab
              colors={colors}
              homeSummary={homeSummary}
              onRefresh={loadAll}
              onClosePeriod={handleClosePeriod}
            />
          )}
        </Tab.Screen>

        <Tab.Screen name="Transactions">
          {() => (
            <TransactionsTab
              colors={colors}
              categories={categories}
              transactions={transactions}
              onAddExpense={handleAddExpense}
              onDeleteTransaction={handleDeleteTransaction}
            />
          )}
        </Tab.Screen>

        <Tab.Screen name="Categories">
          {() => (
            <CategoriesTab
              colors={colors}
              budgets={budgets}
              onSaveBudget={handleSaveBudget}
            />
          )}
        </Tab.Screen>

        <Tab.Screen name="Profile">
          {() => (
            <ProfileTab
              colors={colors}
              profile={profile}
              onSaveProfile={handleSaveProfile}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}