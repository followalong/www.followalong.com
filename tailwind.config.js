/** Quiet Reader design tokens. The single source of truth for colour, type,
 *  and radii — components compose these, never raw hex. */
module.exports = {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        // Bars and rails. The slate the wordmark is drawn in.
        chrome: {
          DEFAULT: '#323e51',
          deep: '#262f3e',
          icon: '#d3dae5',
          muted: '#a3b0c2',
          dim: '#6b7a91'
        },
        // The brand blue the signal mark is drawn in.
        primary: {
          DEFAULT: '#0a8adb',
          hover: '#0870b4'
        },
        // Active nav, unread, progress.
        accent: {
          DEFAULT: '#f5b301',
          ink: '#b0862a'
        },
        page: '#f7f5f1',
        surface: {
          DEFAULT: '#ffffff',
          sheet: '#fdfcfa',
          sunken: '#f2f0ec',
          rail: '#f0ede7'
        },
        ink: {
          DEFAULT: '#16242b',
          soft: '#2c3a41',
          body: '#3d4b52',
          secondary: '#5b6b73',
          muted: '#7a848b',
          subtle: '#8a9299',
          faint: '#b0aca2'
        },
        hairline: {
          DEFAULT: '#e6e1d7',
          soft: '#eee9df',
          strong: '#e0dbd1',
          outline: '#d5cfc3'
        },
        inactive: {
          DEFAULT: '#c9c4ba',
          track: '#d9d4ca'
        },
        following: {
          DEFAULT: '#1c7c3f',
          bg: '#e7f3ea',
          border: '#d0e5d6'
        },
        danger: {
          DEFAULT: '#a03828',
          bg: '#fdf6f4',
          border: '#f0d0c8'
        },
        warning: '#b05c2a'
      },
      fontFamily: {
        sans: ['Public Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Reading content only.
        serif: ['Newsreader', 'Palatino', 'Times', 'serif']
      },
      fontSize: {
        nav: ['10.5px', { lineHeight: '1.2' }],
        meta: ['12px', { lineHeight: '1.4' }],
        chip: ['12.5px', { lineHeight: '1.4' }],
        body: ['13.5px', { lineHeight: '1.5' }],
        title: ['17px', { lineHeight: '1.3' }],
        card: ['15.5px', { lineHeight: '1.3' }],
        'card-lg': ['16.5px', { lineHeight: '1.3' }],
        read: ['17.5px', { lineHeight: '1.65' }]
      },
      borderRadius: {
        field: '9px',
        card: '14px',
        sheet: '18px',
        pill: '999px'
      },
      maxWidth: {
        // Desktop is tablet: content never grows past the tablet width.
        app: '834px',
        river: '640px',
        read: '470px'
      },
      spacing: {
        // Minimum touch target.
        touch: '44px'
      },
      // `prose` is reading content, so it is the only place serif appears.
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            fontFamily: theme('fontFamily.serif').join(', '),
            fontSize: '17.5px',
            lineHeight: '1.65',
            color: theme('colors.ink.soft'),
            maxWidth: 'none',
            a: { color: theme('colors.primary.DEFAULT') },
            'h1, h2, h3, h4': {
              fontFamily: theme('fontFamily.serif').join(', '),
              color: theme('colors.ink.DEFAULT')
            }
          }
        }
      })
    }
  },
  plugins: [require('@tailwindcss/typography')]
}
