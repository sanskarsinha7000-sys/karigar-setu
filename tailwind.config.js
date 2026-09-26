module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        terracotta: '#D9822B',
        rust: '#A04E26',
        indigoDye: '#2B2B6B',
        sand: '#F6F0E6',
        forest: '#2F6A4A',
        gold: '#C9A84D'
      },
      fontFamily: {
        heading: ['Merriweather', 'Georgia', 'serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui']
      }
    }
  },
  plugins: []
}
