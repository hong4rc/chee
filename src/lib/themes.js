const THEMES = {
  chesscom: {
    base: '#302e2b',
    mantle: '#262421',
    crust: '#1a1917',
    surface0: '#3d3b38',
    surface1: '#4a4845',
    overlay0: '#6b6966',
    overlay1: '#7b7977',
    subtext0: '#a09d99',
    subtext1: '#989795',
    text: '#c8c5c0',
    green: '#81b64c',
    peach: '#e8833a',
  },
  lichess: {
    base: '#241f1a',
    mantle: '#1a1714',
    crust: '#14110a',
    surface0: '#404040',
    surface1: '#382f28',
    overlay0: '#6b6b6b',
    overlay1: '#838383',
    subtext0: '#949494',
    subtext1: '#b9b9b9',
    text: '#cccccc',
    green: '#5a9e3e',
    peach: '#d97706',
  },
  latte: {
    base: '#eff1f5',
    mantle: '#e6e9ef',
    crust: '#dce0e8',
    surface0: '#ccd0da',
    surface1: '#bcc0cc',
    overlay0: '#9ca0b0',
    overlay1: '#8c8fa1',
    subtext0: '#6c6f85',
    subtext1: '#5c5f77',
    text: '#4c4f69',
    green: '#40a02b',
    peach: '#fe640b',
  },
  frappe: {
    base: '#303446',
    mantle: '#292c3c',
    crust: '#232634',
    surface0: '#414559',
    surface1: '#51576d',
    overlay0: '#737994',
    overlay1: '#838ba7',
    subtext0: '#a5adce',
    subtext1: '#b5bfe2',
    text: '#c6d0f5',
    green: '#a6d189',
    peach: '#ef9f76',
  },
  macchiato: {
    base: '#24273a',
    mantle: '#1e2030',
    crust: '#181926',
    surface0: '#363a4f',
    surface1: '#494d64',
    overlay0: '#6e738d',
    overlay1: '#8087a2',
    subtext0: '#a5adcb',
    subtext1: '#b8c0e0',
    text: '#cad3f5',
    green: '#a6da95',
    peach: '#f5a97f',
  },
  mocha: {
    base: '#1e1e2e',
    mantle: '#181825',
    crust: '#11111b',
    surface0: '#313244',
    surface1: '#45475a',
    overlay0: '#6c7086',
    overlay1: '#7f849c',
    subtext0: '#a6adc8',
    subtext1: '#bac2de',
    text: '#cdd6f4',
    green: '#a6e3a1',
    peach: '#fab387',
  },
};

const SITE_THEMES = [
  { match: 'chess.com', theme: 'chesscom' },
  { match: 'lichess.org', theme: 'lichess' },
];

export function resolveSiteTheme() {
  const host = window.location.hostname;
  for (const { match, theme } of SITE_THEMES) {
    if (host.includes(match)) return theme;
  }
  return 'chesscom';
}

export function applyTheme(el, name) {
  const resolved = name === 'site' ? resolveSiteTheme() : name;
  const palette = THEMES[resolved] || THEMES.chesscom;
  for (const [key, value] of Object.entries(palette)) {
    el.style.setProperty(`--chee-${key}`, value);
  }
}
