import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        urdu: ['var(--font-noto-nastaliq)', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
