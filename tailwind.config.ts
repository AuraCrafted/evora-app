import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "dice-roll": {
          "0%":   { transform: "translate(0, 0) rotate(0deg) scale(1)" },
          "10%":  { transform: "translate(-6px, -4px) rotate(72deg) scale(1.05)" },
          "20%":  { transform: "translate(7px, 3px) rotate(160deg) scale(0.96)" },
          "30%":  { transform: "translate(-5px, 5px) rotate(245deg) scale(1.08)" },
          "40%":  { transform: "translate(6px, -6px) rotate(330deg) scale(0.94)" },
          "50%":  { transform: "translate(-7px, 2px) rotate(420deg) scale(1.06)" },
          "60%":  { transform: "translate(5px, 5px) rotate(515deg) scale(0.97)" },
          "70%":  { transform: "translate(-4px, -5px) rotate(600deg) scale(1.04)" },
          "80%":  { transform: "translate(3px, 3px) rotate(680deg) scale(0.98)" },
          "90%":  { transform: "translate(-2px, -1px) rotate(740deg) scale(1.02)" },
          "100%": { transform: "translate(0, 0) rotate(800deg) scale(1)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 30px hsl(22 90% 75% / 0.3)" },
          "50%": { boxShadow: "0 0 60px hsl(22 90% 75% / 0.6)" },
        },
        "card-accept": {
          "0%":   { transform: "scale(1) translateY(0)", opacity: "1" },
          "30%":  { transform: "scale(1.04) translateY(-4px)", opacity: "1" },
          "100%": { transform: "scale(0.92) translateY(-40px)", opacity: "0" },
        },
        "card-reject": {
          "0%, 100%": { transform: "translateX(0)", opacity: "1" },
          "15%": { transform: "translateX(-12px) rotate(-2deg)" },
          "30%": { transform: "translateX(12px) rotate(2deg)" },
          "45%": { transform: "translateX(-10px) rotate(-1.5deg)" },
          "60%": { transform: "translateX(10px) rotate(1.5deg)" },
          "75%": { transform: "translateX(-6px) rotate(-1deg)", opacity: "0.7" },
          "90%": { transform: "translateX(6px) rotate(1deg)", opacity: "0.3" },
          "100%": { transform: "translateX(0) scale(0.95)", opacity: "0" },
        },
        "dice-spin-fast": {
          "0%":   { transform: "rotate(0deg) scale(1)" },
          "50%":  { transform: "rotate(540deg) scale(1.15)" },
          "100%": { transform: "rotate(1080deg) scale(0.6)", opacity: "0" },
        },
        "dice-shake-out": {
          "0%, 100%": { transform: "translateX(0)" },
          "10%": { transform: "translateX(-10px) rotate(-8deg)" },
          "25%": { transform: "translateX(12px) rotate(8deg)" },
          "40%": { transform: "translateX(-12px) rotate(-6deg)" },
          "55%": { transform: "translateX(10px) rotate(6deg)" },
          "70%": { transform: "translateX(-6px) rotate(-3deg)", opacity: "0.6" },
          "100%": { transform: "translateX(0) scale(0.85)", opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "dice-roll": "dice-roll 1.1s cubic-bezier(0.36, 0.07, 0.19, 0.97) both",
        "float": "float 3s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.6s ease-out",
        "scale-in": "scale-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "card-accept": "card-accept 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "card-reject": "card-reject 0.55s cubic-bezier(0.36, 0.07, 0.19, 0.97) forwards",
        "dice-spin-fast": "dice-spin-fast 0.55s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "dice-shake-out": "dice-shake-out 0.55s cubic-bezier(0.36, 0.07, 0.19, 0.97) forwards",
      },
      fontFamily: {
        display: ["'Fraunces'", "Georgia", "serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
