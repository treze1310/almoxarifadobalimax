/* Tailwind config for the frontend react app. This is where the app theme should be defined: https://v2.tailwindcss.com/docs/configuration. */
import type { Config } from 'tailwindcss'
import animatePlugin from 'tailwindcss-animate'
import typographyPlugin from '@tailwindcss/typography'
import aspectRatioPlugin from '@tailwindcss/aspect-ratio'

export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      // Escala tipográfica do design system (PRD): título de página 24/600,
      // seção 18/600, corpo 14, tabela 13. Substitui os 3 tamanhos de título
      // que existiam espalhados pelos módulos.
      fontSize: {
        'ds-page': ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }],
        'ds-section': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        'ds-body': ['0.875rem', { lineHeight: '1.375rem' }],
        'ds-table': ['0.8125rem', { lineHeight: '1.25rem' }],
      },
      // Padding de página: 24px desktop / 16px mobile
      spacing: {
        'ds-page': '1.5rem',
        'ds-page-mobile': '1rem',
      },
      colors: {
        // Status com cor fixa no sistema inteiro (PRD)
        status: {
          rascunho: 'hsl(var(--status-rascunho))',
          pendente: 'hsl(var(--status-pendente))',
          aprovado: 'hsl(var(--status-aprovado))',
          concluido: 'hsl(var(--status-concluido))',
          rejeitado: 'hsl(var(--status-rejeitado))',
          cancelado: 'hsl(var(--status-cancelado))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        DEFAULT: '0 2px 4px rgba(0, 0, 0, 0.05)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        shake: {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(4px, 0, 0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        shake: 'shake 0.82s cubic-bezier(.36,.07,.19,.97) both',
      },
      /* Add performance optimizations */
      willChange: {
        'transform-opacity': 'transform, opacity',
        'scroll': 'scroll-position',
        'contents': 'contents',
      },
      backdropFilter: {
        'none': 'none',
        'blur': 'blur(20px)',
      },
    },
  },
  plugins: [
    animatePlugin,
    typographyPlugin,
    aspectRatioPlugin,
    // Add plugin for performance optimizations
    function({ addUtilities }) {
      const newUtilities = {
        '.gpu-accelerated': {
          'transform': 'translateZ(0)',
          'backface-visibility': 'hidden',
          'will-change': 'transform',
        },
        '.scroll-optimized': {
          'transform': 'translateZ(0)',
          'contain': 'layout style',
          'overflow': 'auto',
        },
        '.no-scroll-linked': {
          'transform': 'translateZ(0)',
          'will-change': 'auto',
          'backface-visibility': 'hidden',
        }
      }
      addUtilities(newUtilities, ['responsive', 'hover'])
    }
  ],
} satisfies Config
