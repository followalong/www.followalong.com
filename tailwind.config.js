/** Quiet Reader design tokens. The single source of truth for colour, type,
 *  and radii — components compose these, never raw hex. */
module.exports = {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        // Bars and rails. The light blue the .net site puts behind its top bar.
        // Deep enough that white text on it clears 4.5:1. The .net blue
        // (#1b8cd8) only reached 3.63:1, which the page title cannot afford.
        chrome: {
          DEFAULT: '#187bbe',
          deep: '#0f6ba8',
          icon: '#ffffff',
          muted: '#eaf6ff',
          dim: '#c2e2f7'
        },
        // Darker sibling of the bar blue: actions and links sit on white, where
        // #1b8cd8 would only reach 3.4:1 against it.
        primary: {
          DEFAULT: '#0f6ba8',
          hover: '#0b5484'
        },
        // Active nav, unread, progress.
        accent: {
          DEFAULT: '#f5b301',
          tint: '#fdf0d1',
          ink: '#896921'
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
          muted: '#6f787e',
          subtle: '#70767c',
          faint: '#b0aca2'
        },
        hairline: {
          DEFAULT: '#e6e1d7',
          soft: '#eee9df',
          strong: '#e0dbd1',
          outline: '#d5cfc3'
        },
        inactive: {
          DEFAULT: '#8b857b',
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
        micro: ['10px', { lineHeight: '1.2' }],
        tiny: ['11px', { lineHeight: '1.3' }],
        nav: ['10.5px', { lineHeight: '1.2' }],
        field: ['13px', { lineHeight: '1.4' }],
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
        nav: '10px',
        avatar: '11px',
        card: '14px',
        sheet: '18px',
        pill: '999px'
      },
      maxWidth: {
        // Desktop is tablet: content never grows past the tablet width.
        app: '834px',
        river: '640px',
        read: '470px',
        panel: '560px'
      },
      maxHeight: {
        sheet: '92vh'
      },
      width: {
        pip: '310px',
        'pip-lg': '460px'
      },
      spacing: {
        // Minimum touch target.
        touch: '44px',
        // The AppBar's fixed left and right slots, so the title never shifts.
        slot: '34px',
        icon: '18px',
        play: '26px',
        // Clears the mobile tab bar.
        'tab-bar': '100px',
        0.75: '3px',
        4.5: '18px'
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
