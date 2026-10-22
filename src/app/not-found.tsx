import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BottleSilhouette } from "@/components/brand/product-image";
import { WaterBackdrop } from "@/components/brand/water-decor";

export default function NotFound() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-mist px-6 text-center">
      <WaterBackdrop />
      <div className="relative">
        <div className="relative mx-auto h-48 w-28">
          <span className="absolute inset-x-2 bottom-0 h-3 rounded-[50%] bg-ocean/15 blur-sm" />
          <BottleSilhouette tone="soft" className="absolute inset-x-0 bottom-2 top-0 animate-float-soft" />
        </div>
        <h1 className="mt-6 text-5xl">404</h1>
        <p className="mt-2 text-navy-500">Ubos na ang tubig dito — this page doesn&apos;t exist.</p>
        <Button asChild className="mt-6">
          <Link href="/">Back to AquaNest</Link>
        </Button>
      </div>
    </main>
  );
}
