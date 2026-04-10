import React from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { HomeScreen } from "./screens/HomeScreen";
import { TransactionsScreen } from "./screens/TransactionsScreen";
import { CategoriesScreen } from "./screens/CategoriesScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { AnalyticsScreen } from "./screens/AnalyticsScreen";

import { useAppColors } from "./styles/theme";
import { useAppData } from "./hooks/useAppData";
import { useAppFonts } from "./fonts";

const Tab = createBottomTabNavigator();

function formatCents(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toFixed(2)}`;
}

function AppShell() {
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

  const navTheme = {
    ...(colors.bg === "#F4F6F8" ? DefaultTheme : DarkTheme),
    colors: {
      ...(colors.bg === "#F4F6F8" ? DefaultTheme.colors : DarkTheme.colors),
      background: colors.bg,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.accent,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: 74,
            paddingTop: 8,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
            fontFamily: "Inter_600SemiBold",
          },
          tabBarIcon: ({ color, size, focused }) => {
            let name: keyof typeof Ionicons.glyphMap = "ellipse";

            switch (route.name) {
              case "Home":
                name = focused ? "home" : "home-outline";
                break;
              case "Transactions":
                name = focused ? "swap-horizontal" : "swap-horizontal-outline";
                break;
              case "Categories":
                name = focused ? "grid" : "grid-outline";
                break;
              case "Analytics":
                name = focused ? "stats-chart" : "stats-chart-outline";
                break;
              case "Profile":
                name = focused ? "person-circle" : "person-circle-outline";
                break;
            }

            return <Ionicons name={name} size={size} color={color} />;
          },
        })}
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

export default function App() {
  const [fontsLoaded] = useAppFonts();

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0A0A0B",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return <AppShell />;
}