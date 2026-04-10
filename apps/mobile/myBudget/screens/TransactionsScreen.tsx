import React, { useEffect, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { Card } from "../components/Card";
import { PillSelector } from "../components/PillSelector";
import { commonStyles } from "../styles/common";
import { ThemeColors } from "../styles/theme";
import { Category, Transaction } from "../types";

function formatCents(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toFixed(2)}`;
}

export function TransactionsScreen({
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
      const first = categories.find((c) => c.counts_toward_budget) ?? categories[0];
      setSelectedCategoryId(first.id);
    }
  }, [categories, selectedCategoryId]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={commonStyles.screenContent}>
        <Text style={[commonStyles.title, { color: colors.text }]}>Transactions</Text>

        <Card colors={colors}>
          <Text style={[commonStyles.sectionTitle, { color: colors.text }]}>Quick Add Expense</Text>

          <PillSelector
            options={categories.filter((c) => c.counts_toward_budget).map((c) => c.id) as string[]}
            selected={selectedCategoryId}
            onSelect={setSelectedCategoryId}
            colors={colors}
          />

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
                    <Text style={{ color: selected ? "#FFFFFF" : colors.text, fontWeight: "600" }}>
                      {item.name}
                    </Text>
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
            style={[commonStyles.input, { borderColor: colors.border, color: colors.text }]}
          />

          <TextInput
            placeholder="Merchant name (optional)"
            placeholderTextColor={colors.subtext}
            value={merchantName}
            onChangeText={setMerchantName}
            style={[commonStyles.input, { borderColor: colors.border, color: colors.text }]}
          />

          <TextInput
            placeholder="Note (optional)"
            placeholderTextColor={colors.subtext}
            value={note}
            onChangeText={setNote}
            style={[commonStyles.input, { borderColor: colors.border, color: colors.text }]}
          />

          <Pressable
            onPress={async () => {
              try {
                await onAddExpense({
                  category_id: selectedCategoryId,
                  amount,
                  merchant_name: merchantName,
                  note,
                });
                setAmount("");
                setMerchantName("");
                setNote("");
              } catch (err: any) {
                Alert.alert("Add failed", err?.message ?? "Unknown error");
              }
            }}
            style={[commonStyles.button, { backgroundColor: colors.accent }]}
          >
            <Text style={commonStyles.buttonText}>Add Expense</Text>
          </Pressable>
        </Card>

        <Card colors={colors}>
          <Text style={[commonStyles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>

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
                  onPress={async () => {
                    try {
                      await onDeleteTransaction(item.id);
                    } catch (err: any) {
                      Alert.alert("Delete failed", err?.message ?? "Unknown error");
                    }
                  }}
                  style={{
                    alignSelf: "flex-start",
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: "600" }}>Delete</Text>
                </Pressable>
              </View>
            );
          })}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}