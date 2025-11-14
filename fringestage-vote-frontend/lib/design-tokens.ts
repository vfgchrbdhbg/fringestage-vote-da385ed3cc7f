/**
 * Deterministic Design Tokens for FringeStage Vote
 * 
 * Seed: sha256("FringeStage Vote" + "Sepolia" + "202511" + "FringeStageVote")
 * Theme: Theater-inspired Modern Minimalism
 * 
 * Color Palette: Deep Violet + Amber Gold (Theater curtain & Spotlight)
 * Typography: Inter font family
 * Layout: Card-based grid with ample whitespace
 * Components: 12px border-radius, soft shadows, subtle gradients
 * Animation: Fade-in/out with ease-out curves (stage lighting effect)
 * Dark Mode: Deep gray base (#1A1A2E) with neon purple accents
 */

export const designTokens = {
  // Color System
  colors: {
    // Primary: Deep Violet (Theater Curtain)
    primary: {
      50: "#faf5ff",
      100: "#f3e8ff",
      200: "#e9d5ff",
      300: "#d8b4fe",
      400: "#c084fc",
      500: "#a855f7",
      600: "#9333ea", // Main primary color
      700: "#7e22ce",
      800: "#6b21a8",
      900: "#581c87",
    },
    
    // Accent: Amber Gold (Spotlight)
    accent: {
      50: "#fffbeb",
      100: "#fef3c7",
      200: "#fde68a",
      300: "#fcd34d",
      400: "#fbbf24",
      500: "#f59e0b",
      600: "#d97706", // Main accent color
      700: "#b45309",
      800: "#92400e",
      900: "#78350f",
    },
    
    // Semantic Colors
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#3b82f6",
    
    // Neutral Colors (Light Mode)
    gray: {
      50: "#f9fafb",
      100: "#f3f4f6",
      200: "#e5e7eb",
      300: "#d1d5db",
      400: "#9ca3af",
      500: "#6b7280",
      600: "#4b5563",
      700: "#374151",
      800: "#1f2937",
      900: "#111827",
    },
    
    // Dark Mode Colors
    dark: {
      base: "#1A1A2E",
      surface: "#16213E",
      elevated: "#0F3460",
      neon: "#E94560",
    },
  },
  
  // Typography
  typography: {
    fontFamily: {
      sans: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      mono: '"JetBrains Mono", "Fira Code", monospace',
    },
    fontSize: {
      xs: "0.75rem",    // 12px
      sm: "0.875rem",   // 14px
      base: "1rem",     // 16px
      lg: "1.125rem",   // 18px
      xl: "1.25rem",    // 20px
      "2xl": "1.5rem",  // 24px
      "3xl": "1.875rem",// 30px
      "4xl": "2.25rem", // 36px
      "5xl": "3rem",    // 48px
      "6xl": "3.75rem", // 60px
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  
  // Spacing (8px base unit)
  spacing: {
    xs: "0.25rem",  // 4px
    sm: "0.5rem",   // 8px
    md: "1rem",     // 16px
    lg: "1.5rem",   // 24px
    xl: "2rem",     // 32px
    "2xl": "3rem",  // 48px
    "3xl": "4rem",  // 64px
    "4xl": "6rem",  // 96px
    "5xl": "8rem",  // 128px
  },
  
  // Border Radius
  borderRadius: {
    none: "0",
    sm: "0.25rem",   // 4px
    md: "0.5rem",    // 8px
    lg: "0.75rem",   // 12px - Main border radius
    xl: "1rem",      // 16px
    "2xl": "1.5rem", // 24px
    "3xl": "2rem",   // 32px
    full: "9999px",
  },
  
  // Shadows
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
    inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
    glow: "0 0 20px rgba(168, 85, 247, 0.4)",
  },
  
  // Animation Durations
  animation: {
    duration: {
      fast: "150ms",
      normal: "300ms",
      slow: "500ms",
      slower: "800ms",
    },
    easing: {
      linear: "linear",
      easeIn: "cubic-bezier(0.4, 0, 1, 1)",
      easeOut: "cubic-bezier(0, 0, 0.2, 1)", // Main easing
      easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
      bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
    },
  },
  
  // Breakpoints (responsive)
  breakpoints: {
    mobile: "0px",
    tablet: "768px",
    desktop: "1024px",
    wide: "1280px",
  },
  
  // Component Density
  density: {
    compact: {
      padding: "0.5rem",
      gap: "0.5rem",
      fontSize: "0.875rem",
    },
    comfortable: {
      padding: "1rem",
      gap: "1rem",
      fontSize: "1rem",
    },
  },
  
  // Accessibility
  a11y: {
    minContrastRatio: 4.5, // WCAG AA
    focusRingColor: "#9333ea",
    focusRingWidth: "2px",
    focusRingOffset: "2px",
  },
} as const;

export type DesignTokens = typeof designTokens;

