import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface CitationsChartProps {
  data: { year: string; citations: string }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-md border border-primary/20 shadow-lg p-3 rounded-lg flex flex-col gap-1">
        <p className="text-sm font-bold text-foreground font-serif">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <p className="text-xs text-muted-foreground font-mono">
            {payload[0].value} citations
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export default function CitationsChart({ data }: CitationsChartProps) {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      year: d.year,
      citations: parseInt(d.citations, 10),
    }));
  }, [data]);

  return (
    <div className="w-full h-[300px] w-full pt-4">
      <ResponsiveContainer width="100%" height={300} minHeight={300}>
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="currentColor"
            className="text-border opacity-50"
          />
          <XAxis
            dataKey="year"
            axisLine={false}
            tickLine={false}
            tick={{
              fill: "currentColor",
              fontSize: 12,
              className: "text-muted-foreground",
            }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{
              fill: "currentColor",
              fontSize: 12,
              className: "text-muted-foreground",
            }}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "var(--primary)", opacity: 0.1 }}
          />
          <Bar
            dataKey="citations"
            fill="var(--primary)"
            radius={[4, 4, 0, 0]}
            animationDuration={1500}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
