"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Trash2, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";
import type { ExpenseCategory } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KpiCard, PageHeader } from "@/components/admin/page-header";
import { BreakdownDonut } from "@/components/admin/charts";
import { EXPENSE_CATEGORIES, EXPENSE_LABEL } from "@/lib/constants";
import { peso } from "@/lib/utils";
import { deleteExpenseAction, saveExpenseAction } from "../actions";

type Exp = { id?: string; category: ExpenseCategory; description: string; amount: number; date: string };

function shift(month: string, d: number) {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const dt = new Date(Date.UTC(y, m - 1 + d, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function ExpensesClient({ month, currentMonth, sales, orderCount, expenses }: { month: string; currentMonth: string; sales: number; orderCount: number; expenses: Exp[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState<Exp | null>(null);
  const [cat, setCat] = useState<string>("ALL");
  const [pending, start] = useTransition();
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const profit = sales - total;
  const margin = sales ? (profit / sales) * 100 : 0;
  const byCat = EXPENSE_CATEGORIES.map((c) => ({ name: EXPENSE_LABEL[c], value: expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0) })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
  const list = cat === "ALL" ? expenses : expenses.filter((e) => e.category === cat);
  const label = new Date(`${month}-01T00:00:00+08:00`).toLocaleDateString("en-PH", { month: "long", year: "numeric", timeZone: "Asia/Manila" });
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error);
      toast.success(msg);
      after?.();
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses & Profit"
        subtitle="Profit = Sales − Expenses"
        actions={
          <>
            <div className="flex items-center gap-1 rounded-2xl bg-white p-1 ring-1 ring-slate-100">
              <Button size="icon-sm" variant="ghost" onClick={() => router.push(`/admin/expenses?month=${shift(month, -1)}`)} aria-label="Previous month">
                <ChevronLeft />
              </Button>
              <span className="min-w-36 text-center text-sm font-bold">{label}</span>
              <Button size="icon-sm" variant="ghost" disabled={month >= currentMonth} onClick={() => router.push(`/admin/expenses?month=${shift(month, 1)}`)} aria-label="Next month">
                <ChevronRight />
              </Button>
            </div>
            <Button onClick={() => setEdit({ category: "SEAL", description: "", amount: 0, date: today })}>
              <Plus /> Add expense
            </Button>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Sales" value={peso(sales)} icon={<TrendingUp className="h-5 w-5" />} sub={`${orderCount} delivered orders`} />
        <KpiCard label="Expenses" value={peso(total)} tone="amber" icon={<Wallet className="h-5 w-5" />} sub={`${expenses.length} entries`} />
        <KpiCard label="Profit" value={peso(profit)} tone={profit >= 0 ? "emerald" : "rose"} icon={<span className="text-lg">₱</span>} sub={`${margin.toFixed(1)}% margin`} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Entries</CardTitle>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger className="h-9 w-48 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {EXPENSE_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Category</TH>
                <TH>Description</TH>
                <TH className="text-right">Amount</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {list.map((e) => (
                <TR key={e.id}>
                  <TD className="text-xs text-navy-500">{e.date}</TD>
                  <TD>
                    <Badge variant="outline">{EXPENSE_LABEL[e.category]}</Badge>
                  </TD>
                  <TD className="max-w-xs truncate">{e.description}</TD>
                  <TD className="text-right font-bold">{peso(e.amount)}</TD>
                  <TD className="text-right">
                    <Button size="icon-sm" variant="ghost" onClick={() => setEdit(e)} aria-label="Edit">
                      <Pencil />
                    </Button>
                    <Button size="icon-sm" variant="ghost" onClick={() => confirm("Delete expense?") && run(() => deleteExpenseAction(e.id!), "Deleted")} aria-label="Delete">
                      <Trash2 />
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          {list.length === 0 && <p className="p-10 text-center text-sm text-navy-400">No expenses recorded.</p>}
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>By category</CardTitle>
          </CardHeader>
          <CardContent>{byCat.length ? <BreakdownDonut data={byCat} /> : <p className="text-sm text-navy-400">—</p>}</CardContent>
        </Card>
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edit?.id ? "Edit expense" : "Add expense"}</DialogTitle>
          </DialogHeader>
          {edit && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => saveExpenseAction(edit), "Expense saved", () => setEdit(null));
              }}
            >
              <div>
                <Label>Category</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {EXPENSE_CATEGORIES.map((c) => (
                    <button type="button" key={c} onClick={() => setEdit({ ...edit, category: c })} className={`rounded-xl px-2 py-2 text-[11px] font-bold ring-1 ${edit.category === c ? "bg-ocean text-white ring-ocean" : "ring-slate-200"}`}>
                      {EXPENSE_LABEL[c]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Input value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} placeholder="e.g. Meralco bill (kuryente)" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Amount ₱</Label>
                  <Input type="number" min={0.01} step="0.01" value={edit.amount || ""} onChange={(e) => setEdit({ ...edit, amount: Number(e.target.value) })} required />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={edit.date} max={today} onChange={(e) => setEdit({ ...edit, date: e.target.value })} required />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending && <Loader2 className="animate-spin" />} Save
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
