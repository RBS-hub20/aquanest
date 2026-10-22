import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Toaster } from "sonner";
import { CartProvider } from "@/components/shared/cart-provider";
import { PwaRegister } from "@/components/shared/pwa";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "AquaNest™ — Water Refilling Station & Delivery | Pure Water. Happy Home.",
    template: "%s · AquaNest™",
  },
  description:
    "Order purified, mineral and alkaline water refills online. Same-day delivery with live tracking, GCash & Maya payments, Suki Mode auto-orders and free refill rewards. Pure Water. Happy Home.",
  keywords: ["water refilling station", "water delivery", "purified water", "alkaline water", "mineral water", "Pasig", "Philippines", "GCash", "AquaNest"],
  applicationName: "AquaNest",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "AquaNest", statusBarStyle: "default" },
  openGraph: {
    type: "website",
    siteName: "AquaNest™",
    title: "AquaNest™ — Pure Water. Happy Home.",
    description: "Water refilling station & delivery. Order in 30 seconds, track your rider live.",
    images: [{ url: "/brand/brand-board.jpg", width: 1280, height: 853, alt: "AquaNest brand" }],
    locale: "en_PH",
  },
  twitter: { card: "summary_large_image", title: "AquaNest™ — Pure Water. Happy Home.", images: ["/brand/brand-board.jpg"] },
};

export const viewport: Viewport = {
  themeColor: "#0C6DB5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale === "tl" ? "fil" : "en"} className={jakarta.variable}>
      <body className="min-h-screen font-sans">
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Manila">
          <CartProvider>{children}</CartProvider>
        </NextIntlClientProvider>
        <Toaster position="top-center" richColors closeButton toastOptions={{ className: "rounded-2xl" }} />
        <PwaRegister />
      </body>
    </html>
  );
}
