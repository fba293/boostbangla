// ============================================
// BoostBangla Tailwind Config v3.0
// Following design.md color system
// Dark mode support, custom animations
// ============================================

module.exports = {
    // Scan all HTML and JS files in parent directory
    content: [
        '../**/*.html',
        '../**/*.js',
        '!../node_modules/**',
        '!../dist/**'
    ],
    
    // Dark mode with class strategy
    darkMode: 'class',
    
    theme: {
        extend: {
            // Design.md color palette
            colors: {
                primary: {
                    DEFAULT: '#FF6B00',
                    dark: '#CC5500',
                    light: '#FF8C42',
                    50: '#FFF6F0',
                    100: '#FFE8D9',
                    200: '#FFD1B3',
                    300: '#FFBA8C',
                    400: '#FFA366',
                    500: '#FF6B00',
                    600: '#CC5500',
                    700: '#994000',
                    800: '#662A00',
                    900: '#331500'
                },
                // Semantic colors
                success: '#10b981',
                danger: '#ef4444',
                warning: '#f59e0b',
                info: '#3b82f6',
                // Dark mode backgrounds
                dark: {
                    bg: '#02101A',
                    surface: '#1e293b',
                    card: '#1e293b'
                }
            },
            
            // Border radius from design.md (bolder shapes)
            borderRadius: {
                'sm': '4px',
                'md': '6px',
                'lg': '8px',
                'xl': '16px',
                '2xl': '24px',
                '3xl': '32px',
                'full': '9999px'
            },
            
            // Shadows from design.md (dramatic)
            boxShadow: {
                'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.15)',
                'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                '2xl': '0 35px 45px -12px rgba(0, 0, 0, 0.25)',
                '3xl': '0 45px 60px -15px rgba(0, 0, 0, 0.3)',
                'card': '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
                'card-hover': '0 30px 40px -15px rgba(255, 107, 0, 0.25)'
            },
            
            // Spacing from design.md (generous proportions)
            spacing: {
                '18': '4.5rem',
                '22': '5.5rem',
                '26': '6.5rem',
                '30': '7.5rem',
                '72': '18rem',
                '80': '20rem',
                '96': '24rem'
            },
            
            // Font families from design.md
            fontFamily: {
                'sans': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                'bangla': ['Noto Sans Bengali', 'Inter', 'sans-serif']
            },
            
            // Font sizes from design.md (BIG & BOLD)
            fontSize: {
                'xxs': ['10px', { lineHeight: '1.2' }],
                'xs': ['12px', { lineHeight: '1.25' }],
                'sm': ['14px', { lineHeight: '1.4' }],
                'base': ['16px', { lineHeight: '1.5' }],
                'lg': ['18px', { lineHeight: '1.5' }],
                'xl': ['20px', { lineHeight: '1.4' }],
                '2xl': ['24px', { lineHeight: '1.3' }],
                '3xl': ['30px', { lineHeight: '1.2' }],
                '4xl': ['36px', { lineHeight: '1.2' }],
                '5xl': ['48px', { lineHeight: '1.1' }],
                '6xl': ['60px', { lineHeight: '1.1' }],
                '7xl': ['72px', { lineHeight: '1' }]
            },
            
            // Font weights from design.md
            fontWeight: {
                'light': '300',
                'normal': '400',
                'medium': '500',
                'semibold': '600',
                'bold': '700',
                'extrabold': '800',
                'black': '900'
            },
            
            // Custom animations from design.md
            animation: {
                'slide-up': 'slideUp 0.5s ease-out forwards',
                'slide-down': 'slideDown 0.4s ease-out forwards',
                'slide-in-right': 'slideInRight 0.3s ease-out forwards',
                'fade-in': 'fadeIn 0.5s ease-out forwards',
                'float': 'float 3s ease-in-out infinite',
                'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'spin-slow': 'spin 3s linear infinite',
                'shimmer': 'shimmer 1.5s infinite',
                'bounce-slow': 'bounce 2s infinite'
            },
            
            // Keyframes for custom animations
            keyframes: {
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(30px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' }
                },
                slideDown: {
                    '0%': { opacity: '0', transform: 'translateY(-30px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' }
                },
                slideInRight: {
                    '0%': { transform: 'translateX(100%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' }
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' }
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-8px)' }
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' }
                }
            },
            
            // Backdrop blur for glass morphism
            backdropBlur: {
                'xs': '2px',
                'sm': '4px',
                'md': '8px',
                'lg': '12px',
                'xl': '16px',
                '2xl': '24px'
            },
            
            // Custom screen breakpoints (Tailwind default + extra)
            screens: {
                'xs': '475px',
                'sm': '640px',
                'md': '768px',
                'lg': '1024px',
                'xl': '1280px',
                '2xl': '1536px',
                '3xl': '1920px'
            },
            
            // Transition timing functions
            transitionTimingFunction: {
                'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)'
            },
            
            // Transition duration
            transitionDuration: {
                '2000': '2000ms',
                '3000': '3000ms'
            }
        }
    },
    
    plugins: [
        // Custom plugin for glass morphism utilities
        function({ addUtilities, theme }) {
            addUtilities({
                '.glass': {
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                },
                '.glass-dark': {
                    background: 'rgba(30, 41, 59, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                },
                '.text-gradient': {
                    background: 'linear-gradient(135deg, #FF6B00, #CC5500)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent'
                },
                '.scrollbar-hide': {
                    '-ms-overflow-style': 'none',
                    'scrollbar-width': 'none',
                    '&::-webkit-scrollbar': {
                        display: 'none'
                    }
                },
                '.touch-target': {
                    minWidth: '44px',
                    minHeight: '44px'
                }
            });
        }
    ]
};