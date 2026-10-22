"use client";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-[60vh] place-items-center px-6 text-center">
      <div>
        <p className="text-5xl">💧</p>
        <h1 className="mt-4 text-2xl">Something spilled.</h1>
        <p className="mt-2 max-w-md text-sm text-navy-400">{error.message || "Please try again."}</p>
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
