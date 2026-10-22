"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Download, Loader2, MessageSquareText, Phone, Plus, Search, Send, Wallet } from "lucide-react";
import { toast } from "sonner";
import type { ContainerType } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, KpiCard } from "@/components/admin/page-header";
import { CONTAINER_LABEL, CONTAINERS } from "@/lib/constants";
import { displayPhone, peso } from "@/lib/utils";
import { adjustBalanceAction, adjustGallonsAction, createCustomerAction, recordPaymentAction, smsBlastAction, toggleCustomerActiveAction, updateTagsAction } from "../actions";

type C = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  tags: string[];
  balance: number;
  deposit: number;
  isActive: boolean;
  createdAt: string;
  address: string | null;
  orders: number;
  spent: number;
  lastOrder: string | null;
  gallons: { container: ContainerType; owned: number; borrowed: number }[];
  borrowed: number;
  suki: boolean;
  points: number;
};

const TEMPLATES = [
  { label: "Utang reminder", text: "Hi {name}! Friendly reminder po: you have a {balance} balance with AquaNest. Salamat po! 💧" },
  { label: "Promo", text: "Hi {name}! Use code SUKI10 for ₱10 off your next refill this week. Order at aquanest.ph 💧" },
  { label: "Holiday hours", text: "Hi {name}! AquaNest will open 8AM–5PM this holiday. Order early para hindi maubusan! 💧" },
];

export function CustomersClient({ customers }: { customers: C[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const [selected, setSelected] = useState<C | null>(null);
  const [blast, setBlast] = useState(false);
  const [adding, setAdding] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const [pending, start] = useTransition();

  const list = useMemo(() => {
    const term = q.toLowerCase().trim();
    return customers.filter((c) => {
      if (tab === "suki" && !c.tags.includes("Suki")) return false;
      if (tab === "utang" && c.balance <= 0) return false;
      if (tab === "gallons" && c.borrowed <= 0) return false;
      if (!term) return true;
      return c.name.toLowerCase().includes(term) || c.phone.includes(term.replace(/^0/, "")) || (c.address ?? "").toLowerCase().includes(term);
    });
  }, [customers, q, tab]);

  const totalUtang = customers.reduce((s, c) => s + c.balance, 0);
  const totalLoaned = customers.reduce((s, c) => s + c.borrowed, 0);
  const current = selected ? customers.find((c) => c.id === selected.id) ?? selected : null;

  const exportCsv = () => {
    const rows = [["Name", "Phone", "Orders", "Total spent", "Utang", "Deposit", "Gallons borrowed", "Tags"], ...list.map((c) => [c.name, displayPhone(c.phone), c.orders, c.spent.toFixed(2), c.balance.toFixed(2), c.deposit.toFixed(2), c.borrowed, c.tags.join(" ")])];
    const blob = new Blob([rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "aquanest-customers.csv";
    a.click();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customer CRM"
        subtitle="Suki, utang and gallon loans in one place"
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}>
              <Download /> CSV
            </Button>
            <Button variant="secondary" onClick={() => setBlast(true)}>
              <MessageSquareText /> SMS blast {checked.length ? `(${checked.length})` : ""}
            </Button>
            <Button onClick={() => setAdding(true)}>
              <Plus /> Customer
            </Button>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Customers" value={customers.length} icon={<span className="text-lg">👨‍👩‍👧</span>} />
        <KpiCard label="Suki" value={customers.filter((c) => c.tags.includes("Suki")).length} tone="aqua" icon={<span className="text-lg">⭐</span>} />
        <KpiCard label="Total utang" value={peso(totalUtang)} tone="rose" icon={<Wallet className="h-5 w-5" />} sub={`${customers.filter((c) => c.balance > 0).length} customers`} />
        <KpiCard label="Gallons on loan" value={totalLoaned} tone="violet" icon={<span className="text-lg">🫙</span>} />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="suki">Suki</TabsTrigger>
              <TabsTrigger value="utang">May Utang</TabsTrigger>
              <TabsTrigger value="gallons">May Hiram</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, address" className="pl-9" />
          </div>
        </div>
        <Table>
          <THead>
            <TR>
              <TH className="w-10">
                <input type="checkbox" aria-label="Select all" checked={checked.length > 0 && checked.length === list.length} onChange={(e) => setChecked(e.target.checked ? list.map((c) => c.id) : [])} />
              </TH>
              <TH>Customer</TH>
              <TH>Orders</TH>
              <TH>Spent</TH>
              <TH>Utang</TH>
              <TH>Gallons</TH>
              <TH>Tags</TH>
              <TH>Last order</TH>
            </TR>
          </THead>
          <TBody>
            {list.map((c) => (
              <TR key={c.id} className="cursor-pointer" onClick={() => setSelected(c)}>
                <TD onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" aria-label={`Select ${c.name}`} checked={checked.includes(c.id)} onChange={(e) => setChecked((x) => (e.target.checked ? [...x, c.id] : x.filter((i) => i !== c.id)))} />
                </TD>
                <TD>
                  <div className="flex items-center gap-3">
                    <UserAvatar name={c.name} className="h-9 w-9" />
                    <div>
                      <p className="font-semibold">
                        {c.name} {!c.isActive && <Badge variant="outline">disabled</Badge>}
                      </p>
                      <p className="text-xs text-navy-400">{displayPhone(c.phone)}</p>
                    </div>
                  </div>
                </TD>
                <TD className="font-semibold">{c.orders}</TD>
                <TD>{peso(c.spent)}</TD>
                <TD className={c.balance > 0 ? "font-bold text-rose-600" : "text-navy-400"}>{peso(c.balance)}</TD>
                <TD>
                  {c.gallons.filter((g) => g.owned + g.borrowed > 0).length ? (
                    <span className="text-xs">
                      {c.gallons
                        .filter((g) => g.owned + g.borrowed > 0)
                        .map((g) => `${g.owned + g.borrowed} ${g.container.split("_")[0].toLowerCase()}${g.borrowed ? ` (${g.borrowed} hiram)` : ""}`)
                        .join(", ")}
                    </span>
                  ) : (
                    <span className="text-navy-400">—</span>
                  )}
                </TD>
                <TD>
                  <div className="flex flex-wrap gap-1">
                    {c.tags.map((t) => (
                      <Badge key={t} variant={t === "May Utang" ? "danger" : t === "Suki" ? "aqua" : "outline"}>
                        {t}
                      </Badge>
                    ))}
                  </div>
                </TD>
                <TD className="text-xs text-navy-400">{c.lastOrder ? formatDistanceToNow(new Date(c.lastOrder), { addSuffix: true }) : "—"}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
        {list.length === 0 && <p className="p-10 text-center text-sm text-navy-400">No customers match.</p>}
      </Card>

      {/* Customer drawer */}
      <Dialog open={!!current} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent side="right">{current && <CustomerDrawer c={current} onDone={() => router.refresh()} />}</DialogContent>
      </Dialog>

      {/* SMS blast */}
      <SmsBlastDialog open={blast} onOpenChange={setBlast} selected={checked} onSent={() => setChecked([])} />

      {/* Add customer */}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New customer</DialogTitle>
            <DialogDescription>For phone-in suki who don&apos;t use the app yet.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              start(async () => {
                const r = await createCustomerAction({ name: String(fd.get("name")), phone: String(fd.get("phone")), tags: fd.get("suki") ? ["Suki"] : [] });
                if (!r.ok) return void toast.error(r.error);
                toast.success("Customer added");
                setAdding(false);
                router.refresh();
              });
            }}
          >
            <div>
              <Label htmlFor="cn">Name</Label>
              <Input id="cn" name="name" required />
            </div>
            <div>
              <Label htmlFor="cp">Mobile</Label>
              <Input id="cp" name="phone" placeholder="0917 123 4567" required />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="suki" /> Tag as Suki
            </label>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Save
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CustomerDrawer({ c, onDone }: { c: C; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [pay, setPay] = useState("");
  const [tags, setTags] = useState(c.tags.join(", "));
  const [balance, setBalance] = useState(String(c.balance));
  const [deposit, setDeposit] = useState(String(c.deposit));
  const [gallons, setGallons] = useState(() => Object.fromEntries(CONTAINERS.filter((k) => k !== "BOTTLED_CASE").map((k) => [k, c.gallons.find((g) => g.container === k) ?? { container: k, owned: 0, borrowed: 0 }])));
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error);
      toast.success(msg);
      onDone();
    });

  return (
    <div className="space-y-5">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <UserAvatar name={c.name} className="h-14 w-14 text-lg" />
          <div>
            <DialogTitle>{c.name}</DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-ocean">
                <Phone className="h-3.5 w-3.5" /> {displayPhone(c.phone)}
              </a>
              · since {new Date(c.createdAt).toLocaleDateString("en-PH", { month: "short", year: "numeric" })}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-2xl bg-mist p-3">
          <p className="text-xs text-navy-400">Orders</p>
          <p className="text-lg font-extrabold">{c.orders}</p>
        </div>
        <div className="rounded-2xl bg-mist p-3">
          <p className="text-xs text-navy-400">Spent</p>
          <p className="text-lg font-extrabold">{peso(c.spent, { compact: true })}</p>
        </div>
        <div className="rounded-2xl bg-amber-50 p-3">
          <p className="text-xs text-navy-400">Points</p>
          <p className="text-lg font-extrabold">{c.points}</p>
        </div>
      </div>
      {c.address && <p className="rounded-2xl bg-mist p-3 text-sm text-navy-500">📍 {c.address}</p>}

      <section className="space-y-2 rounded-2xl border border-slate-100 p-4">
        <p className="font-bold">Utang & deposit</p>
        <div className="flex gap-2">
          <Input type="number" min={0} step="0.01" value={pay} onChange={(e) => setPay(e.target.value)} placeholder="Payment received ₱" />
          <Button disabled={pending || !Number(pay)} onClick={() => run(() => recordPaymentAction(c.id, Number(pay)), "Payment recorded")}>
            Record
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Utang ₱</Label>
            <Input type="number" min={0} step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} />
          </div>
          <div>
            <Label>Deposit held ₱</Label>
            <Input type="number" min={0} step="0.01" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
          </div>
        </div>
        <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => adjustBalanceAction(c.id, Number(balance), Number(deposit)), "Balances updated")}>
          Save balances
        </Button>
      </section>

      <section className="space-y-2 rounded-2xl border border-slate-100 p-4">
        <p className="font-bold">Gallon loans</p>
        {Object.values(gallons).map((g) => (
          <div key={g.container} className="grid grid-cols-[1fr_80px_80px] items-center gap-2 text-sm">
            <span className="text-navy-500">{CONTAINER_LABEL[g.container]}</span>
            <Input type="number" min={0} value={g.owned} onChange={(e) => setGallons({ ...gallons, [g.container]: { ...g, owned: Number(e.target.value) } })} aria-label="Owned" />
            <Input type="number" min={0} value={g.borrowed} onChange={(e) => setGallons({ ...gallons, [g.container]: { ...g, borrowed: Number(e.target.value) } })} aria-label="Borrowed" />
          </div>
        ))}
        <p className="text-right text-[11px] text-navy-400">owned · borrowed</p>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(async () => {
              for (const g of Object.values(gallons)) {
                const r = await adjustGallonsAction(c.id, g.container, g.owned, g.borrowed);
                if (!r.ok) return r;
              }
              return { ok: true };
            }, "Gallons updated")
          }
        >
          Save gallons
        </Button>
      </section>

      <section className="space-y-2 rounded-2xl border border-slate-100 p-4">
        <p className="font-bold">Tags</p>
        <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Suki, VIP, Office" />
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => updateTagsAction(c.id, tags.split(",")), "Tags saved")}>
            Save tags
          </Button>
          <label className="flex items-center gap-2 text-sm">
            Active
            <Switch checked={c.isActive} onCheckedChange={(v) => run(() => toggleCustomerActiveAction(c.id, v), v ? "Account enabled" : "Account disabled")} />
          </label>
        </div>
      </section>
    </div>
  );
}

function SmsBlastDialog({ open, onOpenChange, selected, onSent }: { open: boolean; onOpenChange: (v: boolean) => void; selected: string[]; onSent: () => void }) {
  const [audience, setAudience] = useState<"ALL" | "SUKI" | "UTANG" | "SELECTED">(selected.length ? "SELECTED" : "ALL");
  const [msg, setMsg] = useState(TEMPLATES[1]!.text);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>SMS blast</DialogTitle>
          <DialogDescription>Mock SMS gateway — messages are logged and delivered as in-app notifications. Use {"{name}"} and {"{balance}"}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                ["ALL", "Everyone"],
                ["SUKI", "Suki"],
                ["UTANG", "May Utang"],
                ["SELECTED", `Selected (${selected.length})`],
              ] as const
            ).map(([k, l]) => (
              <button key={k} disabled={k === "SELECTED" && !selected.length} onClick={() => setAudience(k)} className={`rounded-xl px-3 py-2 text-xs font-bold ring-1 disabled:opacity-40 ${audience === k ? "bg-ocean text-white ring-ocean" : "ring-slate-200"}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATES.map((t) => (
              <button key={t.label} onClick={() => setMsg(t.text)} className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-ocean">
                {t.label}
              </button>
            ))}
          </div>
          <div>
            <Textarea rows={4} value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={480} />
            <p className="mt-1 text-right text-xs text-navy-400">{msg.length}/480 · ~{Math.ceil(msg.length / 160)} SMS</p>
          </div>
          <Button
            className="w-full"
            disabled={pending || msg.trim().length < 5}
            onClick={() =>
              start(async () => {
                const r = await smsBlastAction({ audience, userIds: selected, message: msg });
                if (!r.ok) return void toast.error(r.error);
                toast.success(`SMS sent to ${r.data?.sent} customer(s) 📲`);
                onSent();
                onOpenChange(false);
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" /> : <Send />} Send blast
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
