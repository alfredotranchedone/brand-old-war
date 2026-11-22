/** Palette della mappa: colori tenui e piatti. I colori NATO saturi restano alle unità. */
export const MAP_THEME = {
  background: '#d9dccf',
  terrain: {
    clear: '#eef0e4',
  } as Record<string, string>,
  terrainFallback: '#e6e6e6',
  gridLine: 'rgba(70, 80, 60, 0.28)',
  mapBorder: 'rgba(60, 70, 50, 0.7)',
  hoverFill: 'rgba(255, 255, 255, 0.55)',
  hoverStroke: '#2f3a28',
  selectedStroke: '#e8a400',
  reachFill: 'rgba(70, 160, 225, 0.30)',
  path: '#0d4f85',
  targetFill: 'rgba(208, 38, 43, 0.22)',
  targetStroke: '#b3141a',
  advanceStroke: '#1f7a3a',
  supportFriendly: '#5cf08a',
  supportEnemy: '#ff6a5c',
  /** Bolle di contraerea e guerra elettronica. */
  bubble: { aa: '#ff9f1c', ew: '#c77dff' },
  coordText: 'rgba(60, 70, 50, 0.55)',
  labelText: '#3d4434',
  labelHalo: 'rgba(238, 240, 228, 0.9)',
  side: {
    blue: { solid: '#0068b5', tint: 'rgba(0, 104, 181, 0.13)' },
    red: { solid: '#d0262b', tint: 'rgba(208, 38, 43, 0.13)' },
  },
  strengthBox: { stroke: '#22261e' },
  /** Colore del box forza per fascia: si usa la prima con `max` ≥ forza. */
  strengthBands: [
    { max: 3, fill: '#d0262b', text: '#ffffff' },
    { max: 6, fill: '#f2c400', text: '#22261e' },
    { max: Infinity, fill: '#2e9e4f', text: '#ffffff' },
  ],
  warning: { fill: '#f2b705', stroke: '#5a4300', text: '#22261e' },
  font: '"Inter", "Helvetica Neue", Arial, sans-serif',
} as const;
