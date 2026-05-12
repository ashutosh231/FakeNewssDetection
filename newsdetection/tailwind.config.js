/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        acid: '#D2E823',
        paper: '#F8F4E8',
        ink: '#09090B',
      },
      fontFamily: {
        display: ['"Dela Gothic One"', 'cursive'],
        sans: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'hard-sm': '2px 2px 0px 0px #09090B',
        'hard-md': '4px 4px 0px 0px #09090B',
        'hard-lg': '8px 8px 0px 0px #09090B',
      },
      keyframes: {
        glitch: {
          '0%':   { transform: 'translate(0,0)' },
          '20%':  { transform: 'translate(-2px, 2px)' },
          '40%':  { transform: 'translate(-2px, -2px)' },
          '60%':  { transform: 'translate(2px, 2px)' },
          '80%':  { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0,0)' },
        },
        floating: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        scanPulse: {
          '0%, 100%': { opacity: '0.5' },
          '50%':      { opacity: '1' },
        },
        scanLine: {
          '0%':   { top: '0%' },
          '100%': { top: '100%' },
        },
        ringRotate: {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
        ringRotateReverse: {
          from: { transform: 'rotate(360deg)' },
          to:   { transform: 'rotate(0deg)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%':      { transform: 'translateY(-20px) rotate(3deg)' },
        },
        'float-mid': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%':      { transform: 'translateY(-12px) rotate(-2deg)' },
          '66%':      { transform: 'translateY(-18px) rotate(2deg)' },
        },
        'float-fast': {
          '0%, 100%': { transform: 'translateY(0px) scale(1)' },
          '50%':      { transform: 'translateY(-10px) scale(1.05)' },
        },
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        glitch:              'glitch 0.3s infinite',
        floating:            'floating 3s ease-in-out infinite',
        marquee:             'marquee 35s linear infinite',
        'scan-pulse':        'scanPulse 2s ease-in-out infinite',
        'scan-line':         'scanLine 3s linear infinite',
        'ring-rotate':       'ringRotate 8s linear infinite',
        'ring-rotate-rev':   'ringRotateReverse 12s linear infinite',
        'float-slow':        'float-slow 6s ease-in-out infinite',
        'float-mid':         'float-mid 4.5s ease-in-out infinite',
        'float-fast':        'float-fast 3s ease-in-out infinite',
        'fade-in':           'fade-in 0.5s ease-out',
        'fade-in-up':        'fade-in-up 0.6s ease-out',
      },
    },
  },
  plugins: [],
}
