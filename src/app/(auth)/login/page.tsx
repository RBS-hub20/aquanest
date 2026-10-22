import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { DEMO_OTP, isDemoMode } from "@/lib/env";
import { Logo } from "@/components/brand/logo";
import { WaterBackdrop, Waves } from "@/components/brand/water-decor";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));

  return (
    <main className="relative grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <section className="relative hidden overflow-hidden bg-navy-gradient lg:block">
        <Image src="/brand/family-photo.jpg" alt="Happy Filipino family with AquaNest water" fill priority className="object-cover opacity-90 mix-blend-luminosity" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/60 to-ocean/30" />
        <Waves color="#00B2E3" opacity={0.18} />
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
          <Logo light href="/" />
          <div className="max-w-md">
            <p className="mb-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">💧 Water Refilling Station & Delivery</p>
            <h2 className="text-5xl font-extrabold leading-[1.05] text-white">
              Pure Water.
              <br />
              <span className="text-aqua-100">Happy Home.</span>
            </h2>
            <p className="mt-4 text-white/80">Order refills in seconds, pay with GCash or Maya, and watch Kuya rider arrive live on the map.</p>
            <div className="mt-8 flex gap-6 text-sm">
              {[
                ["12k+", "Happy families"],
                ["45 min", "Avg. delivery"],
                ["4.9★", "Rating"],
              ].map(([v, l]) => (
                <div key={l}>
                  <p className="text-2xl font-extrabold">{v}</p>
                  <p className="text-white/70">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="relative flex flex-col overflow-hidden bg-gradient-to-b from-mist to-white">
        <WaterBackdrop density={6} />
        <header className="relative z-10 flex items-center justify-between p-5 sm:p-8">
          <div className="lg:invisible">
            <Logo size="sm" />
          </div>
          <LanguageToggle />
        </header>
        <div className="relative z-10 flex flex-1 items-center justify-center px-5 pb-12">
          <LoginForm demo={isDemoMode} demoCode={DEMO_OTP} />
        </div>
      </section>
    </main>
  );
}
