import React from "react";
import { Text, View } from "react-native";
import { VictoryAxis, VictoryBar, VictoryChart, VictoryGroup } from "victory-native";
import { AnalyticsTrendPoint } from "../types";
import { ThemeColors } from "../styles/theme";

export function TrendBarChart({
    colors,
    items,
}: {
    colors: ThemeColors;
    items: AnalyticsTrendPoint[];
}) {
    if (!items.length) {
        return <Text style={{ color: colors.textMuted }}>No trend data yet.</Text>;
    }

    return (
        <View>
            <VictoryChart domainPadding={{ x: 24, y:10 }} width={360} height={260}>
                <VictoryAxis
                    tickValues={items.map((item) => item.label)}
                    style={{
                        axis: { stroke: colors.border },
                        tickLabels: { fill: colors.textMuted, fontSize: 10, angle: -25 },
                        grid: { stroke: "transparent" },
                    }}
                />
                <VictoryAxis
                    dependentAxis
                    style={{
                        axis: { stroke: colors.border },
                        tickLabels: { fill: colors.textMuted, fontSize: 10 },
                        grid: { stroke: colors.border },
                    }}
                />
                <VictoryGroup offset={10}>
                    <VictoryBar
                        data={items}
                        x="label"
                        y="income_cents"
                        style={{ data: { fill: colors.success, width: 8 }}}
                    />
                    <VictoryBar
                        data={items}
                        x="label"
                        y="expense_cents"
                        style={{ data: { fill: colors.danger, width: 8 }}}
                    />
                </VictoryGroup>
            </VictoryChart>

            <View style={{ flexDirection: "row", gap: 16, paddingHorizontal: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: colors.success }} />
                    <Text style={{ color: colors.textMuted }}>Income</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: colors.danger }} />
                    <Text style={{ color: colors.textMuted }}>Expense</Text>
                </View>
            </View>
        </View>
    );
}