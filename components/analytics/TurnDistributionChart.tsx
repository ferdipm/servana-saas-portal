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

interface TurnDistributionChartProps {
  data: {
    turn: string;
    count: number;
    guests: number;
    capacity: number;
  }[];
}

export function TurnDistributionChart({ data }: TurnDistributionChartProps) {
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
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="turn"
            stroke="#71717a"
            style={{ fontSize: "12px" }}
          />
          <YAxis stroke="#71717a" style={{ fontSize: "12px" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #27272a",
              borderRadius: "8px",
              color: "#f4f4f5",
            }}
            labelStyle={{ color: "#a1a1aa" }}
            cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
            formatter={(value: number, name: string) => {
              if (name === "occupancyRate") return [`${value.toFixed(1)}%`, "% Ocupación"];
              return [value, name];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", color: "#a1a1aa" }}
            iconType="rect"
          />
          <Bar
            dataKey="guests"
            stackId="a"
            fill="#6366f1"
            radius={[4, 4, 0, 0]}
            name="Comensales"
          >
            {formattedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.occupancyRate)} />
            ))}
          </Bar>
          <Bar
            dataKey="available"
            stackId="a"
            fill="#52525b"
            radius={[4, 4, 0, 0]}
            name="Disponible"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
