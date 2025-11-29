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
} from "recharts";

interface OccupancyByTimeChartProps {
  data: {
    hour: number;
    count: number;
    guests: number;
  }[];
}

export function OccupancyByTimeChart({ data }: OccupancyByTimeChartProps) {
  const formattedData = data.map((item) => ({
    ...item,
    time: `${item.hour.toString().padStart(2, "0")}:00`,
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="time"
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
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", color: "#a1a1aa" }}
            iconType="rect"
          />
          <Bar
            dataKey="count"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            name="Reservas"
            activeBar={{ fill: "#059669" }}
          />
          <Bar
            dataKey="guests"
            fill="#6366f1"
            radius={[4, 4, 0, 0]}
            name="Comensales"
            activeBar={{ fill: "#4f46e5" }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
