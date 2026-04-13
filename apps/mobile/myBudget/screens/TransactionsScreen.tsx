import React, { useEffect, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Card } from "../components/Card";
import { LabeledInput } from "../components/LabeledInput";
import { SectionHeader } from "../components/SectionHeader";
import { commonStyles } from "../styles/common";
import { ThemeColors } from "../styles/theme";
import { AvatarBadge } from "../components/AvatarBadge";
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
        <View style={{ gap: 6 }}>
          <Text style={[commonStyles.eyebrow, { color: colors.textMuted }]}>Activity</Text>
          <Text style={[commonStyles.title, { color: colors.text }]}>Transactions</Text>
        </View>

        <Card colors={colors} elevated>
          <SectionHeader
            colors={colors}
            title="Add expense"
            subtitle="Record spending quickly without leaving the flow"
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 10 }}>
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
                        backgroundColor: selected ? item.color : colors.surface,
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

          <LabeledInput
            colors={colors}
            label="Amount"
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />

          <LabeledInput
            colors={colors}
            label="Merchant"
            placeholder="Optional"
            value={merchantName}
            onChangeText={setMerchantName}
          />

          <LabeledInput
            colors={colors}
            label="Note"
            placeholder="Optional"
            value={note}
            onChangeText={setNote}
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
          <SectionHeader
            colors={colors}
            title="Recent activity"
            subtitle="Your latest entries for this period"
          />

          <View style={{ gap: 8 }}>
            {transactions.map((item) => {
              const category = categories.find((c) => c.id === item.category_id);
              const isExpense = item.transaction_type === "expense";

              return (
                <View
                  key={item.id}
                  style={{
                    paddingVertical: 10,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    gap: 8,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <View style={{ flexDirection: "row", gap: 12, flex: 1 }}>
                      <AvatarBadge
                        colors={colors}
                        label={item.merchant_name || category?.name || "Txn"}
                        tint={category?.color ? `${category.color}22` : colors.surfaceRaised}
                      />

                      <View style={{ gap: 3, flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>
                          {item.merchant_name || category?.name || "Transaction"}
                        </Text>
                        <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                          {category?.name || "Unknown category"} · {item.transaction_date}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={{
                        color: isExpense ? colors.danger : colors.success,
                        fontSize: 16,
                        fontWeight: "700",
                      }}
                    >
                      {isExpense ? "-" : "+"}
                      {formatCents(item.amount_cents)}
                    </Text>
                  </View>

                  {item.note ? (
                    <Text style={{ color: colors.textSoft, fontSize: 13 }}>{item.note}</Text>
                  ) : null}

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
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: colors.dangerSoft,
                    }}
                  >
                    <Text style={{ color: colors.danger, fontWeight: "700" }}>Delete</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}