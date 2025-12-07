"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { useTheme } from "next-themes";

interface TurnDistributionChartProps {
  data: {
    turn: string;
    count: number;
    guests: number;
    capacity: number;
  }[];
}

export function TurnDistributionChart({ data }: TurnDistributionChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const formattedData = data.map((item) => ({
    ...item,
    occupancyRate: item.capacity > 0 ? (item.guests / item.capacity) * 100 : 0,
    available: Math.max(0, item.capacity - item.guests),
  }));

  const getBarColor = (occupancyRate: number) => {
    if (occupancyRate >= 90) return "#ef4444"; // Red
    if (occupancyRate >= 70) return "#f59e0b"; // Amber
    return "#10b981"; // Green
  };

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#27272a" : "#e4e4e7"} />
          <XAxis
            dataKey="turn"
            stroke={isDark ? "#71717a" : "#a1a1aa"}
            style={{ fontSize: "12px" }}
          />
          <YAxis stroke={isDark ? "#71717a" : "#a1a1aa"} style={{ fontSize: "12px" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? "#18181b" : "#ffffff",
              border: `1px solid ${isDark ? "#27272a" : "#e4e4e7"}`,
              borderRadius: "8px",
              color: isDark ? "#f4f4f5" : "#18181b",
            }}
            labelStyle={{ color: isDark ? "#a1a1aa" : "#71717a" }}
            cursor={{ fill: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)" }}
            formatter={(value: number, name: string) => {
              if (name === "occupancyRate") return [`${value.toFixed(1)}%`, "% Ocupación"];
              return [value, name];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", color: isDark ? "#a1a1aa" : "#71717a" }}
            iconType="rect"
          />
          <Bar
            dataKey="guests"
            stackId="a"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            name="Ocupado"
          >
            {formattedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.occupancyRate)} />
            ))}
          </Bar>
          <Bar
            dataKey="available"
            stackId="a"
            fill={isDark ? "#3f3f46" : "#94a3b8"}
            radius={[4, 4, 0, 0]}
            name="Disponible"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
