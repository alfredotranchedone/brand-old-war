# Hex Wargame — note per Claude Code

Specifica: `../docs/Hex Wargame – Specifica Demo v0.1.md`. Fasi 1–8 completate.

## Comandi (da `code/`, Node 22 — vedi `.nvmrc`)
- `npm run dev` — server di sviluppo
- `npm test` — Vitest (test in `tests/`; non aggiungerne di nuovi, si verifica con typecheck, build e browser)
- `npm run build` — typecheck + build statica in `dist/`

## Struttura di `src/`
- `core/` — motore puro: stato (`game.ts`), azioni (`actions.ts`), turni (`turn.ts`), movimento, ZOC, combattimento, rifornimenti (`supplyNetwork.ts`, `supply.ts`), obiettivi e vittoria.
- `ai/` — IA a funzioni di utilità: `nextAction.ts` sceglie un'azione alla volta.
- `render/` — disegno imperativo su Canvas 2D, animazioni comprese.
- `ui/` — React e Zustand (`store.ts`); salvataggio in `localStorage` (`save.ts`).
- `data/` — JSON di bilanciamento, validati all'avvio.

## Vincoli
- `src/core/` e `src/ai/` sono TypeScript puro: niente DOM, React, `render/` o `ui/`.
- Nessun `Math.random()`: tutta la casualità passa da `core/rng.ts` (stato in `GameState.rngState`).
- Dati e bilanciamento in `src/data/*.json`: cambiare un valore non deve richiedere modifiche al codice.
- Le regole leggono già terreno e meteo (oggi neutri): non scrivere costanti al posto loro. Il bonus di trincea è per terreno (`entrenchmentMod`).
- Ogni modifica allo stato passa da `applyAction(state, data, action)`; l'interfaccia mostra solo ciò che il motore dichiara valido.
- Mappa su Canvas 2D, disegnata in modo imperativo da `render/`; React solo per i pannelli. Nessun re-render React per frame.
- Griglia flat-top: coordinate assiali (q, r) nel codice, offset odd-q (col, row) nei JSON.
- Se cambia la forma di `GameState`, aumentare `VERSION` in `ui/save.ts`.

## Decisioni già prese
- Il meteo futuro sarà casuale per scenario, estratto con `rng.ts`.
- Il Rosso lo gioca sempre l'IA (postura `defend`); la fanteria trincerata tiene la posizione (`holdEntrenchedBonus`).
- Unità a forza 1 (`weakUnit`): non attaccano e muovono con PM dimezzati, senza sommarsi al dimezzamento per rifornimento.
