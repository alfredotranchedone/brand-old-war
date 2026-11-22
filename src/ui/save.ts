import type { GameState } from '../core/game';

const KEY = 'hex-wargame.save';
const VERSION = 4;

interface SaveFile {
  readonly version: number;
  readonly game: GameState;
  /** Impronta dello scenario al momento del salvataggio. */
  readonly scenario?: string;
}

export function saveGame(game: GameState, scenario: string | undefined): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: VERSION, game, scenario } satisfies SaveFile));
  } catch (e) {
    console.warn('Salvataggio non riuscito', e);
  }
}

/** Carica la partita salvata se è valida e il suo scenario esiste invariato. */
export function loadSavedGame(fingerprint: (id: string) => string | undefined): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const save = JSON.parse(raw) as Partial<SaveFile>;
    if (save.version !== VERSION || !save.game) return null;
    const current = fingerprint(save.game.scenarioId);
    if (!current || save.scenario !== current) return null;
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
