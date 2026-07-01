/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}','./components/**/*.{js,jsx}','./lib/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#000000',
        shell:   '#0c0c0c',
        surface: 'rgba(255,255,255,0.03)',
        border:  'rgba(255,255,255,0.1)',
        accent:  '#ccff00',
        emerald: '#10b981',
        danger:  '#ff4d4d',
        textprimary: '#ebebeb',
        muted:   'rgba(235,235,235,0.4)',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      backdropBlur: {
        glass: '16px',
      },
    },
  },
  plugins: [],
}
