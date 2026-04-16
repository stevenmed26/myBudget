import React, { useState } from "react";
import { Alert, SafeAreaView, ScrollView, Text, TextInput } from "react-native";
import { Card } from "../components/Card";
import { ActionButton } from "../components/ActionButton";
import { commonStyles } from "../styles/common";
import { ThemeColors } from "../styles/theme";
import { SectionHeader } from "../components/SectionHeader";

export function LoginScreen({
    colors,
    onLogin,
    onSwitchToSignUp,
} : {
    colors: ThemeColors;
    onLogin: (email: string, password: string) => Promise<void>;
    onSwitchToSignUp: () => void;
}) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
            <ScrollView contentContainerStyle={commonStyles.screenContent}>
                <Text style={[commonStyles.title, { color: colors.text }]}>myBudget</Text>

                <Card colors={colors}>
                    <SectionHeader
                        colors={colors}
                        title="Welcome Back"
                        subtitle="Sign in to continue"
                    />

                    <TextInput
                        placeholder="Email"
                        placeholderTextColor={colors.textSoft}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        value={email}
                        onChangeText={setEmail}
                        style={[
                            commonStyles.input,
                            { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceRaised },
                        ]}
                    />

                    <TextInput
                        placeholder="Password"
                        placeholderTextColor={colors.textSoft}
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                        style={[
                            commonStyles.input,
                            { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceRaised },
                        ]}
                    />

                    <ActionButton
                        label="Sign In"
                        colors={colors}
                        onPress={async () => {
                            try {
                                await onLogin(email.trim(), password);
                            } catch (err: any) {
                                console.error("Login Failed", err);
                                Alert.alert("Login Failed", err?.message ?? "Unknown error");
                            }
                        }}
                    />

                    <Text
                        onPress={onSwitchToSignUp}
                        style={[commonStyles.body, { color: colors.accent }]}
                    >
                        Need an account?
                    </Text>
                </Card>
            </ScrollView>
        </SafeAreaView>
    );
}