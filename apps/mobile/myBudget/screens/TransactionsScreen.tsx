import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../components/Card";
import { PillSelector } from "../components/PillSelector";
import { SectionHeader } from "../components/SectionHeader";
import { ToggleRow } from "../components/ToggleRow";
import { commonStyles } from "../styles/common";
import { ThemeColors } from "../styles/theme";
import { Category, Transaction } from "../types";
import { formatCents, todayISO } from "../lib/format";

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
  onAddExpense: (input: {
    category_id: string;
    amount: string;
    merchant_name: string;
    note: string;
    is_recurring?: boolean;
    frequency?: "weekly" | "biweekly" | "monthly" | "yearly";
    start_date?: string;
  }) => Promise<void>;
  onDeleteTransaction: (transactionID: string) => Promise<void>;
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [note, setNote] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] =
    useState<"weekly" | "biweekly" | "monthly" | "yearly">("monthly");
  const [startDate, setStartDate] = useState(todayISO());

  useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      const first = categories.find((c) => c.counts_toward_budget) ?? categories[0];
      setSelectedCategoryId(first.id);
    }
  }, [categories, selectedCategoryId]);

  const selectableCategories = categories.filter((c) => c.counts_toward_budget);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={commonStyles.screenContent}>
        <Text style={[commonStyles.title, { color: colors.text }]}>
          Transactions
        </Text>

        <Card colors={colors}>
          <SectionHeader
            colors={colors}
            title="Quick Add Expense"
            subtitle="Add a new expense to one of your budget categories"
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {selectableCategories.map((item) => {
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
                      backgroundColor: selected ? item.color : colors.surfaceRaised,
                    }}
                  >
                    <Text
                      style={[
                        commonStyles.label,
                        {
                          color: selected ? colors.white : colors.text,
                        },
                      ]}
                    >
                      {item.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={{ gap: 6 }}>
            <Text style={[commonStyles.inputLabel, { color: colors.text }]}>
              Amount
            </Text>
            <TextInput
              placeholder="Amount in dollars"
              placeholderTextColor={colors.textSoft}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              style={[
                commonStyles.input,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: colors.surfaceRaised,
                },
              ]}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text style={[commonStyles.inputLabel, { color: colors.text }]}>
              Merchant
            </Text>
            <TextInput
              placeholder="Merchant name (optional)"
              placeholderTextColor={colors.textSoft}
              value={merchantName}
              onChangeText={setMerchantName}
              style={[
                commonStyles.input,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: colors.surfaceRaised,
                },
              ]}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text style={[commonStyles.inputLabel, { color: colors.text }]}>
              Note
            </Text>
            <TextInput
              placeholder="Note (optional)"
              placeholderTextColor={colors.textSoft}
              value={note}
              onChangeText={setNote}
              style={[
                commonStyles.input,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: colors.surfaceRaised,
                },
              ]}
            />
          </View>

          <ToggleRow
            colors={colors}
            title="Make this recurring"
            subtitle="Create a repeating expense rule from this entry"
            enabled={isRecurring}
            onToggle={() => setIsRecurring((value) => !value)}
          />

          {isRecurring ? (
            <View style={{ gap: 14 }}>
              <View style={{ gap: 8 }}>
                <Text style={[commonStyles.inputLabel, { color: colors.text }]}>
                  Frequency
                </Text>
                <PillSelector
                  options={["weekly", "biweekly", "monthly", "yearly"] as const}
                  selected={frequency}
                  onSelect={setFrequency}
                  colors={colors}
                />
              </View>

              <View style={{ gap: 6 }}>
                <Text style={[commonStyles.inputLabel, { color: colors.text }]}>
                  Start date
                </Text>
                <TextInput
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSoft}
                  value={startDate}
                  onChangeText={setStartDate}
                  style={[
                    commonStyles.input,
                    {
                      borderColor: colors.border,
                      color: colors.text,
                      backgroundColor: colors.surfaceRaised,
                    },
                  ]}
                />
              </View>
            </View>
          ) : null}

          <Pressable
            onPress={async () => {
              try {
                await onAddExpense({
                  category_id: selectedCategoryId,
                  amount,
                  merchant_name: merchantName,
                  note,
                  is_recurring: isRecurring,
                  frequency,
                  start_date: startDate,
                });

                setAmount("");
                setMerchantName("");
                setNote("");
                setIsRecurring(false);
                setFrequency("monthly");
                setStartDate(todayISO());
              } catch (err: any) {
                Alert.alert("Add failed", err?.message ?? "Unknown error");
              }
            }}
            style={[
              commonStyles.button,
              {
                backgroundColor: colors.accent,
              },
            ]}
          >
            <Text style={commonStyles.buttonText}>
              {isRecurring ? "Add Recurring Expense" : "Add Expense"}
            </Text>
          </Pressable>
        </Card>

        <Card colors={colors}>
          <SectionHeader
            colors={colors}
            title="Recent Transactions"
            subtitle="Your most recent activity for this budget"
          />

          {transactions.length === 0 ? (
            <Text style={[commonStyles.body, { color: colors.textMuted }]}>
              No transactions yet.
            </Text>
          ) : (
            transactions.map((item) => {
              const category = categories.find((c) => c.id === item.category_id);
              const isExpense = item.transaction_type === "expense";

              return (
                <View
                  key={item.id}
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    paddingTop: 12,
                    gap: 6,
                  }}
                >
                  <View style={[commonStyles.rowBetween, { alignItems: "flex-start" }]}>
                    <View style={{ flex: 1, gap: 2, paddingRight: 12 }}>
                      <Text style={[commonStyles.label, { color: colors.text }]}>
                        {item.merchant_name || category?.name || "Transaction"}
                      </Text>

                      <Text style={[commonStyles.caption, { color: colors.textMuted }]}>
                        {category?.name || "Unknown category"} · {item.transaction_date}
                      </Text>

                      {item.note ? (
                        <Text style={[commonStyles.body, { color: colors.textSoft }]}>
                          {item.note}
                        </Text>
                      ) : null}
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
                        {formatCents(item.amount_cents)}
                      </Text>

                      <Pressable
                        onPress={async () => {
                          try {
                            await onDeleteTransaction(item.id);
                          } catch (err: any) {
                            Alert.alert("Delete failed", err?.message ?? "Unknown error");
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
                          backgroundColor: colors.dangerSoft,
                        }}
                      >
                        <Ionicons name="close" size={20} color={colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
