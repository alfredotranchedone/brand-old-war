# Hex Wargame — note per Claude Code

Specifica: `../docs/Hex Wargame – Specifica Demo v0.1.md` (fasi 1–8 completate). Altre specifiche in `../docs/`: organici delle unità, fuoco di supporto.

## Comandi (da `code/`, Node 22 — vedi `.nvmrc`)
- `npm run dev` — gioco su `/`, editor scenari su `/editor.html`
- `npm test` — Vitest (test in `tests/`; non aggiungerne di nuovi, si verifica con typecheck, build e browser)
- `npm run build` — typecheck + build statica in `dist/` (gioco ed editor)

## Struttura di `src/`
- `core/` — motore puro: stato (`game.ts`), azioni (`actions.ts`), turni (`turn.ts`), movimento, ZOC, combattimento (`combat.ts`, `combatPower.ts`), fuoco di supporto (`support.ts`), rifornimenti (`supplyNetwork.ts`, `supply.ts`), obiettivi e vittoria.
- `ai/` — IA a funzioni di utilità: `nextAction.ts` sceglie un'azione alla volta.
- `render/` — disegno imperativo su Canvas 2D: mappa, tile (`tiles.ts`), animazioni, input del mouse condiviso con l'editor (`mapInput.ts`).
- `ui/` — React e Zustand (`store.ts`); salvataggio in `localStorage` (`save.ts`).
- `editor/` — editor scenari, pagina separata (`editor.html`), non collegata al gioco. Il modello è il JSON dello scenario; esporta un file da mettere in `data/scenarios/`.
- `data/` — JSON di bilanciamento, validati all'avvio. Ogni file in `data/scenarios/` è giocabile (scelta in Nuova partita); l'id nel file deve coincidere col nome del file.
- `assets/tiles/` — tile pixel art dei terreni (da `../assets/HexTileset`), richiamate per nome da `terrain.json` (`tile`, `overlay`).

## Vincoli
- `src/core/` e `src/ai/` sono TypeScript puro: niente DOM, React, `render/` o `ui/`.
- Nessun `Math.random()`: tutta la casualità passa da `core/rng.ts` (stato in `GameState.rngState`).
- Dati e bilanciamento in `src/data/*.json`: cambiare un valore non deve richiedere modifiche al codice.
- Le regole leggono terreno e meteo dai dati: non scrivere costanti al posto loro.
- Ogni modifica allo stato passa da `applyAction(state, data, action)`; l'interfaccia mostra solo ciò che il motore dichiara valido.
- Mappa su Canvas 2D, disegnata in modo imperativo da `render/`; React solo per i pannelli. Nessun re-render React per frame.
- Griglia flat-top: coordinate assiali (q, r) nel codice, offset odd-q (col, row) nei JSON.
- Se cambia la forma di `GameState`, aumentare `VERSION` in `ui/save.ts`.
- Nomi delle fazioni: da `game.setup.sideNames` (per scenario, default Blu/Rosso); internamente le fazioni restano `blue`/`red`.

## Decisioni già prese
- Il meteo futuro sarà casuale per scenario, estratto con `rng.ts`.
- Il Rosso lo gioca sempre l'IA (postura `defend`); la fanteria trincerata tiene la posizione (`holdEntrenchedBonus`). L'IA non valuta ancora la difesa del terreno.
- Unità a forza 1 (`weakUnit`): non attaccano e muovono con PM dimezzati, senza sommarsi al dimezzamento per rifornimento.
- Terreni: un tipo per esagono; foreste, colline e montagne sono terreni con immagine sovrapposta. `impassable` blocca movimento, ritirata e rifornimenti.
- Fuoco di supporto automatico (`rules.json` → `support`): fianchi +15% (max 2), difesa +15% (max 1), copertura d'artiglieria −25% del bonus difensivo, sbarramento −20% all'attacco. Chi supporta in attacco consuma l'attacco; in difesa una reazione per turno nemico (`hasReacted`). Gittata d'artiglieria 1–3 come nel gioco.
- Regole speciali via tag in `units.json`: `infiltrator` (forze speciali) ignora la ZOC come `recon`; `engineer` (genieri) si trincera anche dopo aver mosso e annulla la trincea dei nemici adiacenti. HQ e paracadutisti per ora senza regole speciali.
- Organici (uomini e mezzi) solo informativi, in `units.json` → `organic`.
- Strade: rimandate (serviranno anche ai rifornimenti).
