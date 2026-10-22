import Image from "next/image";
import { cn } from "@/lib/utils";

export type Container = "ROUND_19L" | "SLIM_19L" | "GALLON_10L" | "GALLON_6L" | "BOTTLED_CASE";

/** Real AquaNest product photography (transparent WebP in /public/products). */
export const PRODUCT_IMAGES: Record<Container, { src: string; alt: string }> = {
  ROUND_19L: { src: "/products/aquanest-19l-round.webp", alt: "AquaNest 19L round gallon — Water Refilling Station & Delivery" },
  SLIM_19L: { src: "/products/aquanest-slim.webp", alt: "AquaNest slim gallon with faucet" },
  GALLON_10L: { src: "/products/aquanest-10l.webp", alt: "AquaNest 10L (2.5 gallon) container" },
  GALLON_6L: { src: "/products/aquanest-6l.webp", alt: "AquaNest 6L (1.59 gallon) container" },
  BOTTLED_CASE: { src: "/products/aquanest-case-500ml.webp", alt: "AquaNest 500ml bottled water case of 24" },
};

/**
 * Product shot: transparent bottle, soft drop shadow and an optional "Apple-style"
 * float with a breathing ground shadow. Fills its (sized) parent.
 */
export function ProductImage({
  container = "ROUND_19L",
  src,
  alt,
  className,
  float = false,
  ground = true,
  priority,
  sizes = "(max-width: 640px) 40vw, 200px",
  delay = 0,
}: {
  container?: Container | null;
  src?: string | null;
  alt?: string;
  className?: string;
  float?: boolean;
  ground?: boolean;
  priority?: boolean;
  sizes?: string;
  delay?: number;
}) {
  const img = PRODUCT_IMAGES[container ?? "ROUND_19L"];
  return (
    <div className={cn("relative h-full w-full", className)}>
      {ground && (
        <span
          aria-hidden
          className={cn("absolute inset-x-[18%] bottom-0 h-[7%] rounded-[50%] bg-navy/25 blur-md", float && "animate-shadow-breathe")}
          style={{ animationDelay: `${delay}s` }}
        />
      )}
      <div className={cn("absolute inset-x-0 bottom-[4%] top-0", float && "animate-float-soft")} style={{ animationDelay: `${delay}s` }}>
        <Image
          src={src || img.src}
          alt={alt ?? img.alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-contain object-bottom drop-shadow-[0_14px_18px_rgba(10,45,93,0.18)]"
          draggable={false}
        />
      </div>
    </div>
  );
}

/** Brand-gradient bottle silhouette (masks the real 19L photo) for empty states & icons. */
export function BottleSilhouette({ className, tone = "brand" }: { className?: string; tone?: "brand" | "soft" }) {
  const mask = `url(${PRODUCT_IMAGES.ROUND_19L.src}) center / contain no-repeat`;
  return (
    <span
      aria-hidden
      className={cn("block", className)}
      style={{
        WebkitMask: mask,
        mask,
        background: tone === "brand" ? "linear-gradient(160deg,#00B2E3 0%,#0C6DB5 55%,#0A2D5D 100%)" : "linear-gradient(160deg,#D3E8F8 0%,#9FD0F0 100%)",
      }}
    />
  );
}
