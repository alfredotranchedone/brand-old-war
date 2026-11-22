/** Converte la forza dell'unità in effettivi: scala il numero nominale proporzionalmente, minimo 1 se operativa. */
export function effective(nominal: number, strength: number, maxStrength: number): number {
  if (strength <= 0 || nominal <= 0) return 0;
  return Math.max(1, Math.round((nominal * strength) / maxStrength));
}
