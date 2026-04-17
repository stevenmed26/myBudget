import React, { useState } from "react";
import { Alert, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { Card } from "../components/Card";
import { ActionButton } from "../components/ActionButton";
import { commonStyles } from "../styles/common";
import { ThemeColors } from "../styles/theme";
import { SectionHeader } from "../components/SectionHeader";
import { looksLikeEmail } from "../lib/validate";

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
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit() {
        const trimmedEmail = email.trim();

        setError(null);

        if (!trimmedEmail || !password) {
            setError("Email and password are required.");
            return;
        }
        if (!looksLikeEmail(trimmedEmail)) {
            setError("Enter a valid email address.");
            return;
        }

        try {
            setSubmitting(true);
            await onLogin(trimmedEmail, password);
        } catch (err: any) {
            setError(err?.message ?? "Login failed. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }


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
                        autoCorrect={false}
                        keyboardType="email-address"
                        textContentType="emailAddress"
                        value={email}
                        onChangeText={(value) => {
                            setEmail(value);
                            if (error) setError(null);
                        }}
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
                        onChangeText={(value) => {
                            setPassword(value);
                            if (error) setError(null);
                        }}
                        style={[
                            commonStyles.input,
                            { borderColor: colors.border, color: colors.text, backgroundColor: colors.surfaceRaised },
                        ]}
                    />

                    {error ? (
                        <View
                            style={{
                                backgroundColor: colors.dangerSoft,
                                borderColor: colors.danger,
                                borderWidth: 1,
                                borderRadius: 16,
                                paddingHorizontal: 14,
                                paddingVertical: 12,
                            }}
                        >
                            <Text style={[commonStyles.caption, { color: colors.danger}]}>
                                {error}
                            </Text>
                        </View>
                    ) : null}

                    <ActionButton
                        label={submitting ? "Logging in..." : "Log in"}
                        colors={colors}
                        disabled={submitting}
                        onPress={handleSubmit}
                    />

                    <Text
                        onPress={submitting ? undefined : onSwitchToSignUp}
                        style={[commonStyles.body, { color: colors.accent }]}
                    >
                        Need an account?
                    </Text>
                </Card>
            </ScrollView>
        </SafeAreaView>
    );
}