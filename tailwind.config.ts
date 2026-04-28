import type { Config } from 'tailwindcss'

export default {
  theme: {
    extend: {
      screens: {
        xs: '360px',
      },
      spacing: {
        18: '4.5rem',
      },
    },
  },
  plugins: [],
} satisfies Config
