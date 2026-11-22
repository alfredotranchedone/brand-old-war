import type { GameState } from '../core/game';

const KEY = 'hex-wargame.save';
const VERSION = 1;

interface SaveFile {
  readonly version: number;
  readonly game: GameState;
}

export function saveGame(game: GameState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: VERSION, game } satisfies SaveFile));
  } catch (e) {
    console.warn('Salvataggio non riuscito', e);
  }
}

/** Partita salvata per lo scenario, se presente e leggibile. */
export function loadSavedGame(scenarioId: string): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const save = JSON.parse(raw) as Partial<SaveFile>;
    if (save.version !== VERSION || save.game?.scenarioId !== scenarioId) return null;
    return save.game;
  } catch (e) {
    console.warn('Salvataggio illeggibile', e);
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Archivio non disponibile: niente da cancellare.
  }
}
