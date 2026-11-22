/** Palette della mappa: colori tenui e piatti. I colori NATO saturi restano alle unità. */
export const MAP_THEME = {
  background: '#d9dccf',
  offMap: '#c9ccbf',
  terrain: {
    clear: '#eef0e4',
  } as Record<string, string>,
  terrainFallback: '#e6e6e6',
  gridLine: 'rgba(70, 80, 60, 0.28)',
  mapBorder: 'rgba(60, 70, 50, 0.7)',
  hoverFill: 'rgba(255, 255, 255, 0.55)',
  hoverStroke: '#2f3a28',
  coordText: 'rgba(60, 70, 50, 0.55)',
  font: '"Inter", "Helvetica Neue", Arial, sans-serif',
} as const;
