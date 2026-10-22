"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { KpiCard, PageHeader } from "@/components/admin/page-header";
import { BreakdownDonut, CountBarChart, SalesAreaChart, SalesVsExpensesChart } from "@/components/admin/charts";
import { EXPENSE_LABEL } from "@/lib/constants";
import { peso } from "@/lib/utils";
import type { Report } from "@/lib/reports";
import type { ExpenseCategory } from "@prisma/client";

const PERIOD_LABEL = { daily: "Last 14 days", weekly: "Last 12 weeks", monthly: "Last 12 months" } as const;

export function ReportsClient({ report }: { report: Report }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"xlsx" | "pdf" | null>(null);
  const title = `AquaNest ${report.granularity} report`;
  const range = `${new Date(report.start).toLocaleDateString("en-PH", { timeZone: "Asia/Manila" })} – ${new Date(report.end).toLocaleDateString("en-PH", { timeZone: "Asia/Manila" })}`;

  const exportExcel = async () => {
    setBusy("xlsx");
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = "AquaNest";
      const ws = wb.addWorksheet("Sales");
      ws.columns = [
        { header: "Period", key: "label", width: 16 },
        { header: "Orders", key: "orders", width: 10 },
        { header: "Sales (PHP)", key: "sales", width: 16, style: { numFmt: "#,##0.00" } },
        { header: "Expenses (PHP)", key: "expenses", width: 16, style: { numFmt: "#,##0.00" } },
        { header: "Profit (PHP)", key: "profit", width: 16, style: { numFmt: "#,##0.00" } },
      ];
      report.series.forEach((r) => ws.addRow(r));
      ws.addRow({ label: "TOTAL", orders: report.totals.orders, sales: report.totals.sales, expenses: report.totals.expenses, profit: report.totals.profit }).font = { bold: true };
      ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0C6DB5" } };
      const p = wb.addWorksheet("Top products");
      p.columns = [
        { header: "Product", key: "name", width: 30 },
        { header: "Qty", key: "qty", width: 10 },
        { header: "Revenue (PHP)", key: "revenue", width: 16, style: { numFmt: "#,##0.00" } },
      ];
      report.topProducts.forEach((r) => p.addRow(r));
      p.getRow(1).font = { bold: true };
      const e = wb.addWorksheet("Expenses");
      e.columns = [
        { header: "Category", key: "name", width: 26 },
        { header: "Amount (PHP)", key: "value", width: 16, style: { numFmt: "#,##0.00" } },
      ];
      report.byExpense.forEach((r) => e.addRow({ name: EXPENSE_LABEL[r.name as ExpenseCategory] ?? r.name, value: r.value }));
      e.getRow(1).font = { bold: true };
      const buf = await wb.xlsx.writeBuffer();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      a.download = `aquanest-${report.granularity}-report.xlsx`;
      a.click();
    } catch {
      toast.error("Excel export failed");
    } finally {
      setBusy(null);
    }
  };

  const exportPdf = async () => {
    setBusy("pdf");
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      doc.setFillColor(10, 45, 93);
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), 70, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("AquaNest — Sales Report", 36, 38);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`${PERIOD_LABEL[report.granularity]} · ${range} · Pure Water. Happy Home.`, 36, 55);
      doc.setTextColor(10, 45, 93);
      doc.setFontSize(10);
      const t = report.totals;
      doc.text(`Sales: PHP ${t.sales.toFixed(2)}    Expenses: PHP ${t.expenses.toFixed(2)}    Profit: PHP ${t.profit.toFixed(2)}    Orders: ${t.orders}`, 36, 95);
      const money = (n: number) => n.toLocaleString("en-PH", { minimumFractionDigits: 2 });
      autoTable(doc, {
        startY: 110,
        head: [["Period", "Orders", "Sales", "Expenses", "Profit"]],
        body: report.series.map((r) => [r.label, String(r.orders), money(r.sales), money(r.expenses), money(r.profit)]),
        foot: [["TOTAL", String(t.orders), money(t.sales), money(t.expenses), money(t.profit)]],
        headStyles: { fillColor: [12, 109, 181] },
        footStyles: { fillColor: [240, 248, 255], textColor: [10, 45, 93], fontStyle: "bold" },
        styles: { fontSize: 8 },
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
      });
      autoTable(doc, {
        head: [["Top products", "Qty", "Revenue"]],
        body: report.topProducts.map((p) => [p.name, String(p.qty), money(p.revenue)]),
        headStyles: { fillColor: [0, 178, 227] },
        styles: { fontSize: 8 },
      });
      doc.save(`aquanest-${report.granularity}-report.pdf`);
    } catch {
      toast.error("PDF export failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle={`${PERIOD_LABEL[report.granularity]} · ${range}`}
        actions={
          <>
            <Tabs value={report.granularity} onValueChange={(v) => router.push(`/admin/reports?period=${v}`)}>
              <TabsList>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" onClick={exportExcel} disabled={!!busy}>
              {busy === "xlsx" ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />} Excel
            </Button>
            <Button variant="outline" onClick={exportPdf} disabled={!!busy}>
              {busy === "pdf" ? <Loader2 className="animate-spin" /> : <FileText />} PDF
            </Button>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Sales" value={peso(report.totals.sales)} icon={<span className="text-lg">₱</span>} />
        <KpiCard label="Orders" value={report.totals.orders} tone="aqua" icon={<span className="text-lg">🧾</span>} sub={`avg ${peso(report.totals.avgOrder)} / order`} />
        <KpiCard label="Expenses" value={peso(report.totals.expenses)} tone="amber" icon={<span className="text-lg">💸</span>} />
        <KpiCard label="Profit" value={peso(report.totals.profit)} tone={report.totals.profit >= 0 ? "emerald" : "rose"} icon={<span className="text-lg">📈</span>} sub={report.totals.sales ? `${((report.totals.profit / report.totals.sales) * 100).toFixed(1)}% margin` : undefined} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesAreaChart data={report.series} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sales vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesVsExpensesChart data={report.series} height={240} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Delivered orders</CardTitle>
          </CardHeader>
          <CardContent>
            <CountBarChart data={report.series.map((s) => ({ label: s.label, value: s.orders }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sales by channel</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownDonut data={report.byChannel} />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Top products</CardTitle>
          </CardHeader>
          <Table>
            <THead>
              <TR>
                <TH>Product</TH>
                <TH className="text-right">Qty</TH>
                <TH className="text-right">Revenue</TH>
                <TH>Share</TH>
              </TR>
            </THead>
            <TBody>
              {report.topProducts.map((p) => (
                <TR key={p.name}>
                  <TD className="font-semibold">{p.name}</TD>
                  <TD className="text-right">{p.qty}</TD>
                  <TD className="text-right font-bold">{peso(p.revenue)}</TD>
                  <TD className="w-40">
                    <div className="h-2 overflow-hidden rounded-full bg-mist">
                      <div className="h-full rounded-full bg-ocean" style={{ width: `${(p.revenue / (report.topProducts[0]?.revenue || 1)) * 100}%` }} />
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payment methods</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownDonut data={report.byMethod} />
          </CardContent>
        </Card>
      </div>
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Table view</CardTitle>
        </CardHeader>
        <Table>
          <THead>
            <TR>
              <TH>Period</TH>
              <TH className="text-right">Orders</TH>
              <TH className="text-right">Sales</TH>
              <TH className="text-right">Expenses</TH>
              <TH className="text-right">Profit</TH>
            </TR>
          </THead>
          <TBody>
            {report.series.map((r) => (
              <TR key={r.key}>
                <TD>{r.label}</TD>
                <TD className="text-right">{r.orders}</TD>
                <TD className="text-right">{peso(r.sales)}</TD>
                <TD className="text-right">{peso(r.expenses)}</TD>
                <TD className={`text-right font-bold ${r.profit < 0 ? "text-rose-600" : "text-emerald-700"}`}>{peso(r.profit)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
