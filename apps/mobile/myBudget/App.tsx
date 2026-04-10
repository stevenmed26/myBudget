import React from "react";
import { Alert } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { HomeScreen } from "./screens/HomeScreen";
import { TransactionsScreen } from "./screens/TransactionsScreen";
import { CategoriesScreen } from "./screens/CategoriesScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { AnalyticsScreen } from "./screens/AnalyticsScreen";
import { useAppColors } from "./styles/theme";
import { useAppData } from "./hooks/useAppData";

const Tab = createBottomTabNavigator();

function formatCents(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toFixed(2)}`;
}

export default function App() {
  const colors = useAppColors();
  const {
    categories,
    transactions,
    budgets,
    homeSummary,
    profile,
    analytics,
    loadAll,
    addExpense,
    removeTransaction,
    saveBudget,
    saveProfile,
    closePeriod,
  } = useAppData();

  async function handleClosePeriod() {
    const result = await closePeriod();

    if (result.already_closed) {
      Alert.alert(
        "Already closed",
        `This period was already closed.\nLeftover: ${formatCents(result.leftover_amount_cents)}`
      );
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
            <HomeScreen
              colors={colors}
              homeSummary={homeSummary}
              onRefresh={loadAll}
              onClosePeriod={handleClosePeriod}
            />
          )}
        </Tab.Screen>

        <Tab.Screen name="Transactions">
          {() => (
            <TransactionsScreen
              colors={colors}
              categories={categories}
              transactions={transactions}
              onAddExpense={addExpense}
              onDeleteTransaction={removeTransaction}
            />
          )}
        </Tab.Screen>

        <Tab.Screen name="Categories">
          {() => (
            <CategoriesScreen
              colors={colors}
              budgets={budgets}
              onSaveBudget={saveBudget}
            />
          )}
        </Tab.Screen>

        <Tab.Screen name="Analytics">
          {() => <AnalyticsScreen colors={colors} analytics={analytics} />}
        </Tab.Screen>

        <Tab.Screen name="Profile">
          {() => (
            <ProfileScreen
              colors={colors}
              profile={profile}
              onSaveProfile={saveProfile}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}