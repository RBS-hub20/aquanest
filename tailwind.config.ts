import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1280px" } },
    extend: {
      fontFamily: {
        sans: ["var(--font-jakarta)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        ocean: { DEFAULT: "#0C6DB5", 50: "#EAF4FC", 100: "#D3E8F8", 600: "#0C6DB5", 700: "#0A5C9A", 800: "#084A7C" },
        aqua: { DEFAULT: "#00B2E3", 50: "#E6F8FD", 100: "#C7EFFA", 500: "#00B2E3", 600: "#0096C0" },
        navy: { DEFAULT: "#0A2D5D", 50: "#EEF2F8", 400: "#5B7194", 500: "#3C557C", 900: "#0A2D5D" },
        mist: "#F0F8FF",
        leaf: { DEFAULT: "#3DAE4A", 50: "#ECF8EE" },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        "2xl": "20px",
        "3xl": "24px",
      },
      boxShadow: {
        soft: "0 8px 30px rgb(0 0 0 / 0.04)",
        lift: "0 12px 40px rgb(12 109 181 / 0.10)",
        glow: "0 10px 30px -8px rgb(12 109 181 / 0.55)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #0C6DB5 0%, #00B2E3 100%)",
        "navy-gradient": "linear-gradient(135deg, #0A2D5D 0%, #0C6DB5 100%)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-10px)" } },
        "float-soft": { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        "shadow-breathe": { "0%,100%": { transform: "scaleX(1)", opacity: "0.55" }, "50%": { transform: "scaleX(0.86)", opacity: "0.35" } },
        drip: {
          "0%": { transform: "translateY(-20px) scale(0.6)", opacity: "0" },
          "15%": { opacity: "0.9" },
          "100%": { transform: "translateY(110vh) scale(1)", opacity: "0" },
        },
        ripple: { "0%": { transform: "scale(0.8)", opacity: "0.6" }, "100%": { transform: "scale(2.4)", opacity: "0" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        wave: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        float: "float 6s ease-in-out infinite",
        "float-soft": "float-soft 5s ease-in-out infinite",
        "shadow-breathe": "shadow-breathe 5s ease-in-out infinite",
        drip: "drip linear infinite",
        ripple: "ripple 2.4s ease-out infinite",
        wave: "wave 18s linear infinite",
      },
    },
  },
  plugins: [animate],
};
export default config;
