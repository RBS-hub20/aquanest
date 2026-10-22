"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { peso } from "@/lib/utils";

/**
 * Validated categorical order (scripts/validate_palette.js, light surface: all checks pass;
 * orange & aqua are <3:1 vs surface, so every chart ships a legend with values).
 */
export const SERIES = ["#0C6DB5", "#E8890C", "#14A38B", "#7C5CE0", "#C2417A", "#00B2E3"];
const GRID = "#EEF2F7";
const AXIS = { fontSize: 11, fill: "#5B7194" };

function TooltipBox({ active, payload, label, money = true }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; money?: boolean }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-bold text-navy">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-navy-500">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold text-navy">{money ? peso(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

export function SalesAreaChart({ data, height = 260, dataKey = "sales", name = "Sales" }: { data: { label: string; [k: string]: number | string }[]; height?: number; dataKey?: string; name?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0C6DB5" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#00B2E3" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} minTickGap={16} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => peso(v, { compact: true })} width={64} />
        <Tooltip content={<TooltipBox />} cursor={{ stroke: "#0C6DB5", strokeWidth: 1, strokeDasharray: "4 4" }} />
        <Area type="monotone" dataKey={dataKey} name={name} stroke="#0C6DB5" strokeWidth={2} fill="url(#salesFill)" activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CountBarChart({ data, height = 220, name = "Orders" }: { data: { label: string; value: number }[]; height?: number; name?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} minTickGap={12} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} width={44} />
        <Tooltip content={<TooltipBox money={false} />} cursor={{ fill: "#F0F8FF" }} />
        <Bar dataKey="value" name={name} fill="#00B2E3" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Same unit (₱) for both series → one shared axis. */
export function SalesVsExpensesChart({ data, height = 280 }: { data: { label: string; sales: number; expenses: number }[]; height?: number }) {
  return (
    <div>
      <div className="mb-2 flex gap-4 text-xs font-semibold text-navy-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[0] }} /> Sales
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[1] }} /> Expenses
        </span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 6, right: 8, left: -8, bottom: 0 }} barGap={2} barCategoryGap="24%">
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} minTickGap={12} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => peso(v, { compact: true })} width={64} />
          <Tooltip content={<TooltipBox />} cursor={{ fill: "#F0F8FF" }} />
          <Bar dataKey="sales" name="Sales" fill={SERIES[0]} radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenses" name="Expenses" fill={SERIES[1]} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut with an always-visible legend carrying label + value + share. */
export function BreakdownDonut({ data, money = true, height = 200 }: { data: { name: string; value: number }[]; money?: boolean; height?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const rows = data.filter((d) => d.value > 0);
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[180px_1fr]">
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="#fff" strokeWidth={2}>
              {rows.map((d) => (
                <Cell key={d.name} fill={SERIES[data.indexOf(d) % SERIES.length]} />
              ))}
            </Pie>
            <Tooltip content={<TooltipBox money={money} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-navy-400">Total</p>
            <p className="text-base font-extrabold text-navy">{money ? peso(total, { compact: true }) : total}</p>
          </div>
        </div>
      </div>
      <ul className="space-y-2">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: SERIES[i % SERIES.length] }} />
            <span className="flex-1 truncate text-navy-500">{d.name}</span>
            <span className="font-semibold text-navy">{money ? peso(d.value) : d.value}</span>
            <span className="w-10 text-right text-xs text-navy-400">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
