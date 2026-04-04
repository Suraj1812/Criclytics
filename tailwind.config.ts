import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      screens: {
        sm: "100%",
        md: "100%",
        lg: "100%",
        xl: "1380px",
        "2xl": "1500px"
      },
      padding: {
        DEFAULT: "0.75rem",
        sm: "1rem",
        lg: "1.25rem",
        xl: "1.5rem",
        "2xl": "1.5rem"
      }
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
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        }
      },
      borderRadius: {
        xl: "calc(var(--radius) - 4px)",
        "2xl": "var(--radius)",
        "3xl": "calc(var(--radius) + 8px)"
      },
      boxShadow: {
        soft: "0 20px 50px -30px rgba(15, 23, 42, 0.35)",
        lifted: "0 24px 80px -32px rgba(2, 8, 23, 0.5)"
      },
      backgroundImage: {
        "panel-glow":
          "radial-gradient(circle at top left, rgba(56,189,248,0.16), transparent 32%), linear-gradient(145deg, rgba(255,255,255,0.94), rgba(240,246,255,0.9))",
        "panel-glow-dark":
          "radial-gradient(circle at top left, rgba(56,189,248,0.18), transparent 34%), linear-gradient(145deg, rgba(11,18,32,0.94), rgba(12,20,36,0.92))"
      }
    }
  },
  plugins: []
} satisfies Config;
