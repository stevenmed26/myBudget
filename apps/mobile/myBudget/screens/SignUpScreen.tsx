import React, { useState } from "react";
import { Alert, SafeAreaView, ScrollView, Text, TextInput } from "react-native";
import { Card } from "../components/Card";
import { ActionButton } from "../components/ActionButton";
import { commonStyles } from "../styles/common";
import { ThemeColors } from "../styles/theme";
import { SectionHeader } from "@/components/SectionHeader";

export function SignUpScreen({
    colors,
    onSignUp,
    onSwitchToLogin,
} : {
    colors: ThemeColors;
    onSignUp: (email: string, password: string) => Promise<void>;
    onSwitchToLogin: () => void;
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
                        title="Create Account"
                        subtitle="Start your budget setup"
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
                        autoCapitalize="none"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                        style={[
                            commonStyles.input,
                            { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceRaised },
                        ]}
                    />

                    <ActionButton
                        label="Create Account"
                        colors={colors}
                        onPress={async () => {
                            try {
                                await onSignUp(email.trim(), password);
                            } catch (err: any) {
                                console.error("Sign up Failed", err);
                                Alert.alert("Sign up Failed", err?.message ?? "Unknown error");
                            }
                        }}
                    />

                    <Text
                        onPress={onSwitchToLogin}
                        style={[commonStyles.body, { color: colors.accent }]}
                    >
                        Already have an account? Sign in
                    </Text>
                </Card>
            </ScrollView>
        </SafeAreaView>
    );
}