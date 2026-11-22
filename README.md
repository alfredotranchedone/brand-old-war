# Brand Old War

A strategic hex-based wargame that runs entirely in your browser, with a separate scenario editor. Both are under active development, and contributions from everyone are welcome.

[Play the demo](https://alfredotranchedone.github.io/brand-old-war/) · [Open the scenario editor](https://alfredotranchedone.github.io/brand-old-war/editor.html) · [Read the player manual](docs/manual.md)

[![Build](https://github.com/alfredotranchedone/brand-old-war/actions/workflows/deploy-web-pages.yml/badge.svg?branch=main)](https://github.com/alfredotranchedone/brand-old-war/actions/workflows/deploy-web-pages.yml)
[![Latest tag](https://img.shields.io/github/v/tag/alfredotranchedone/brand-old-war?label=version)](https://github.com/alfredotranchedone/brand-old-war/tags)

## The Game

Brand Old War is a turn-based hex wargame. Command ground and air units, use terrain and support fire to your advantage, manage supply, and fight for objectives. The Red side is controlled by the AI.  
 
[Play the demo](https://alfredotranchedone.github.io/brand-old-war/) or [Read the player manual](docs/manual.md) 

## Scenarios

Scenarios define the map, forces, and objectives, and can be selected when starting a new game. The standalone scenario editor lets you create or edit scenarios in the browser and export them as JSON for the game.  
 
[Open the scenario editor](https://alfredotranchedone.github.io/brand-old-war/editor.html) 

## Run Locally

Requires Node.js 22. From the project directory, start the game and editor with:

```bash
npm run dev
```

Open `/` for the game or `/editor.html` for the scenario editor. Run `npm test` for tests or `npm run build` to type-check and build the game and editor.

## License & Copyright

This project uses a dual-licensing model to keep the source code open source while preventing unauthorized commercial exploitation of the game's content.

### 1. Source Code ([LICENSE](LICENSE))
All original source code (HTML, CSS, JavaScript, TypeScript, and game logic) is licensed under the **GNU Affero General Public License v3.0 (AGPLv3)**.
* **You may:** Read, study, modify, and distribute the code, provided any derivative work (including web-hosted versions) is also released under the AGPLv3 with full source code available.

### 2. Game Assets, Maps & Data ([LICENSE-ASSETS](`LICENSE-ASSETS.txt`))
All original visual assets, UI elements, audio, scenario maps, unit statistics/data files, and game rules are licensed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)**.
* **You may:** Share and adapt the material for non-commercial purposes, provided you give appropriate credit and distribute your contributions under the same license.
* **You may NOT:** Use the material for commercial purposes or sell the game.

### 3. Third-Party Resources ([THIRD-PARTY-NOTICES](`THIRD-PARTY-NOTICES.txt`))
This game incorporates third-party open-source libraries and public domain assets (hex tilesets under **CC0 1.0** and military symbols under the **MIT License**). See `THIRD-PARTY-NOTICES.txt` for details.

Copyright (c) 2026 @alfredotranchedone . All rights reserved.
