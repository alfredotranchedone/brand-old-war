# Hex Wargame — note per Claude Code

Specifica: `../docs/Hex Wargame – Specifica Demo v0.1.md`. Si procede una fase alla volta; ogni fase si chiude con test verdi e build funzionante.

## Comandi (da `code/`, Node 22 — vedi `.nvmrc`)
- `npm run dev` — server di sviluppo
- `npm test` — Vitest (test in `tests/`)
- `npm run build` — typecheck + build statica in `dist/`

## Vincoli
- `src/core/` e `src/ai/` sono TypeScript puro: niente DOM, React, `render/` o `ui/`.
- Nessun `Math.random()`: tutta la casualità passa da `core/rng.ts` (stato in `GameState.rngState`).
- Dati e bilanciamento in `src/data/*.json`: cambiare un valore non deve richiedere modifiche al codice.
- Le regole leggono già terreno e meteo (oggi neutri): non scrivere costanti al posto loro.
- Ogni modifica allo stato passa da `applyAction(state, action)`; l'interfaccia mostra solo ciò che il motore dichiara valido.
- Mappa su Canvas 2D, disegnata in modo imperativo da `render/`; React solo per i pannelli. Nessun re-render React per frame.
- Griglia flat-top: coordinate assiali (q, r) nel codice, offset odd-q (col, row) nei JSON.

## Decisioni già prese
- Il meteo futuro sarà casuale per scenario, estratto con `rng.ts`.
