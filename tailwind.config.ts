import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      'sm': '600px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-alexandria)", "var(--font-geist-sans)", "sans-serif"],
        outfit: ["var(--font-outfit)", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        'brand-teal': 'var(--brand-teal)',
        'background-dark': 'var(--background-dark)',
        'card-background-dark': 'var(--card-background-dark)',
        'text-light': 'var(--text-light)',
        'border-dark': 'var(--border-dark)',
      },
    },
  },
  plugins: [],
} satisfies Config;
