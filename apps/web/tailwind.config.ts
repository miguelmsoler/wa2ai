import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			brand: {
  				'25': '#f2f7ff',
  				'50': '#ecf3ff',
  				'100': '#dde9ff',
  				'200': '#c2d6ff',
  				'300': '#9cb9ff',
  				'400': '#7592ff',
  				'500': '#465fff',
  				'600': '#3641f5',
  				'700': '#2a31d8',
  				'800': '#252dae',
  				'900': '#262e89',
  				'950': '#161950'
  			},
  			success: {
  				'25': '#f6fef9',
  				'50': '#ecfdf3',
  				'100': '#d1fadf',
  				'200': '#a6f4c5',
  				'300': '#6ce9a6',
  				'400': '#32d583',
  				'500': '#12b76a',
  				'600': '#039855',
  				'700': '#027a48',
  				'800': '#05603a',
  				'900': '#054f31',
  				'950': '#053321'
  			},
  			error: {
  				'25': '#fffbfa',
  				'50': '#fef3f2',
  				'100': '#fee4e2',
  				'200': '#fecdca',
  				'300': '#fda29b',
  				'400': '#f97066',
  				'500': '#f04438',
  				'600': '#d92d20',
  				'700': '#b42318',
  				'800': '#912018',
  				'900': '#7a271a',
  				'950': '#55160c'
  			},
  			warning: {
  				'25': '#fffcf5',
  				'50': '#fffaeb',
  				'100': '#fef0c7',
  				'200': '#fedf89',
  				'300': '#fec84b',
  				'400': '#fdb022',
  				'500': '#f79009',
  				'600': '#dc6803',
  				'700': '#b54708',
  				'800': '#93370d',
  				'900': '#7a2e0e',
  				'950': '#4e1d09'
  			},
  			gray: {
  				'25': '#fcfcfd',
  				'50': '#f9fafb',
  				'100': '#f2f4f7',
  				'200': '#e4e7ec',
  				'300': '#d0d5dd',
  				'400': '#98a2b3',
  				'500': '#667085',
  				'600': '#475467',
  				'700': '#344054',
  				'800': '#1d2939',
  				'900': '#101828',
  				'950': '#0c111d'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		boxShadow: {
  			'theme-xs': '0px 1px 2px 0px rgba(16, 24, 40, 0.05)',
  			'theme-sm': '0px 1px 3px 0px rgba(16, 24, 40, 0.1), 0px 1px 2px 0px rgba(16, 24, 40, 0.06)',
  			'theme-md': '0px 4px 8px -2px rgba(16, 24, 40, 0.1), 0px 2px 4px -2px rgba(16, 24, 40, 0.06)',
  			'theme-lg': '0px 12px 16px -4px rgba(16, 24, 40, 0.08), 0px 4px 6px -2px rgba(16, 24, 40, 0.03)',
  			'theme-xl': '0px 20px 24px -4px rgba(16, 24, 40, 0.08), 0px 8px 8px -4px rgba(16, 24, 40, 0.03)',
  			'focus-ring': '0px 0px 0px 4px rgba(70, 95, 255, 0.12)'
  		},
  		fontSize: {
  			'theme-xs': [
  				'12px',
  				{
  					lineHeight: '18px'
  				}
  			],
  			'theme-sm': [
  				'14px',
  				{
  					lineHeight: '20px'
  				}
  			],
  			'theme-xl': [
  				'20px',
  				{
  					lineHeight: '30px'
  				}
  			],
  			'title-sm': [
  				'30px',
  				{
  					lineHeight: '38px'
  				}
  			],
  			'title-md': [
  				'36px',
  				{
  					lineHeight: '44px'
  				}
  			],
  			'title-lg': [
  				'48px',
  				{
  					lineHeight: '60px'
  				}
  			],
  			'title-xl': [
  				'60px',
  				{
  					lineHeight: '72px'
  				}
  			],
  			'title-2xl': [
  				'72px',
  				{
  					lineHeight: '90px'
  				}
  			]
  		},
  		fontFamily: {
  			outfit: [
  				'Outfit',
  				'sans-serif'
  			]
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		},
  		zIndex: {
  			'1': '1',
  			'9': '9',
  			'99': '99',
  			'999': '999',
  			'9999': '9999',
  			'99999': '99999',
  			'999999': '999999'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
