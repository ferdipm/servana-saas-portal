"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface ReservationSourcesChartProps {
  data: {
    source: string;
    count: number;
    percentage: number;
  }[];
}

const COLORS = {
  WhatsApp: "#10b981",
  Web: "#6366f1",
  Phone: "#f59e0b",
  "Teléfono": "#f59e0b", // Same color as Phone
  WalkIn: "#8b5cf6",
  Other: "#71717a",
};

export function ReservationSourcesChart({
  data,
}: ReservationSourcesChartProps) {
  const getColor = (source: string) => {
    return COLORS[source as keyof typeof COLORS] || COLORS.Other;
  };

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ source, percentage }) => `${source}: ${percentage.toFixed(1)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="count"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.source)} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #27272a",
              borderRadius: "8px",
              color: "#f4f4f5",
            }}
            itemStyle={{ color: "#f4f4f5" }}
            labelStyle={{ color: "#f4f4f5" }}
            formatter={(value: number, name: string, props: any) => [
              `${value} reservas (${props.payload.percentage.toFixed(1)}%)`,
              props.payload.source,
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
