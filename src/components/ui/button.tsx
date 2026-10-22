import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-ocean to-[#1584D6] text-white shadow-glow hover:brightness-110",
        secondary: "bg-mist text-ocean hover:bg-ocean-50 ring-1 ring-sky-100",
        outline: "border border-slate-200 bg-white text-navy hover:bg-mist hover:border-sky-200",
        ghost: "text-navy hover:bg-mist",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        success: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_10px_30px_-8px_rgb(16_185_129/0.55)]",
        link: "text-ocean underline-offset-4 hover:underline px-0",
        white: "bg-white text-ocean hover:bg-white/90 shadow-lg",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-2xl px-7 text-base",
        xl: "h-14 rounded-2xl px-8 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8 rounded-lg",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
