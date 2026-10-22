"use client";
import type { SerializedOrder } from "@/lib/serialize";

const peso = (n: number) => `PHP ${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const TYPE: Record<string, string> = { REFILL: "Refill", NEW_GALLON: "New + Gallon", BORROW: "Borrow", RETURN: "Return" };

async function loadImage(src: string): Promise<string | null> {
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    return await new Promise((r) => {
      const fr = new FileReader();
      fr.onload = () => r(fr.result as string);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Branded A5 invoice / official receipt PDF generated in the browser. */
export async function downloadInvoice(order: SerializedOrder, store: { name: string; address: string; phone: string; website: string }) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "pt", format: "a5" });
  const W = doc.internal.pageSize.getWidth();

  // header band
  doc.setFillColor(10, 45, 93);
  doc.rect(0, 0, W, 92, "F");
  doc.setFillColor(12, 109, 181);
  doc.rect(0, 86, W, 6, "F");
  const logo = await loadImage("/icons/icon-192.png");
  if (logo) doc.addImage(logo, "PNG", 24, 18, 54, 54);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("AquaNest", 88, 44);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("WATER REFILLING STATION & DELIVERY", 88, 57);
  doc.text("Pure Water. Happy Home.", 88, 68);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("INVOICE", W - 24, 44, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(order.code, W - 24, 58, { align: "right" });
  doc.text(new Date(order.createdAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }), W - 24, 70, { align: "right" });

  // parties
  doc.setTextColor(10, 45, 93);
  let y = 118;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("BILLED TO", 24, y);
  doc.text("FROM", W / 2 + 8, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const billed = [order.customer?.name ?? order.walkInName ?? "Walk-in", order.customer?.phone ?? "", order.addressText ?? "Pick-up / Walk-in"].filter(Boolean);
  doc.text(doc.splitTextToSize(billed.join("\n"), W / 2 - 40), 24, y + 13);
  doc.text(doc.splitTextToSize([store.name, store.address, store.phone, store.website].join("\n"), W / 2 - 32), W / 2 + 8, y + 13);

  autoTable(doc, {
    startY: y + 72,
    margin: { left: 24, right: 24 },
    head: [["Item", "Type", "Qty", "Unit", "Amount"]],
    body: order.items.map((i) => [i.productName, TYPE[i.orderType] ?? i.orderType, String(i.quantity), peso(i.unitPrice + i.containerPrice), peso(i.lineTotal)]),
    styles: { fontSize: 8, cellPadding: 5, textColor: [10, 45, 93] },
    headStyles: { fillColor: [240, 248, 255], textColor: [12, 109, 181], fontStyle: "bold" },
    columnStyles: { 2: { halign: "center" }, 3: { halign: "right" }, 4: { halign: "right" } },
    theme: "grid",
  });

  // totals
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
  const rows: [string, string][] = [["Subtotal", peso(order.subtotal)]];
  if (order.depositTotal) rows.push(["Gallon deposit", peso(order.depositTotal)]);
  rows.push(["Delivery fee", order.deliveryFee ? peso(order.deliveryFee) : "FREE"]);
  if (order.discount) rows.push(["Discount", `- ${peso(order.discount)}`]);
  doc.setFontSize(9);
  rows.forEach(([k, v]) => {
    doc.text(k, W - 170, y);
    doc.text(v, W - 24, y, { align: "right" });
    y += 14;
  });
  doc.setFillColor(12, 109, 181);
  doc.roundedRect(W - 180, y - 4, 156, 26, 6, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL", W - 170, y + 13);
  doc.text(peso(order.total), W - 32, y + 13, { align: "right" });

  doc.setTextColor(10, 45, 93);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Payment: ${order.paymentMethod} · ${order.paymentStatus.replace("_", " ")}`, 24, y + 13);

  // footer
  const H = doc.internal.pageSize.getHeight();
  doc.setDrawColor(0, 178, 227);
  doc.line(24, H - 46, W - 24, H - 46);
  doc.setFontSize(8);
  doc.setTextColor(91, 113, 148);
  doc.text("Salamat po! Return borrowed gallons anytime to refund your deposit.", W / 2, H - 32, { align: "center" });
  doc.text(`${store.phone} · ${store.website}`, W / 2, H - 20, { align: "center" });

  doc.save(`AquaNest-${order.code}.pdf`);
}
