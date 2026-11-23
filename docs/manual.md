# Brand Old War — Player Manual

A turn-based operational wargame on a hex map. You command one side (usually Blue); the AI commands the other.

> The interface is currently in Italian. Interface labels are quoted as they appear on screen.

## Goal

Hold the objectives and destroy enemy units. The game ends after the scenario's last turn (shown in the top bar, e.g. "Turno 1 / 5").

- **Decisive victory:** you hold every objective.
- **Marginal victory:** you have more victory points than the enemy.
- **Defeat:** otherwise.

Victory points = points of the objectives you hold + 1 point for every 5 enemy strength steps destroyed.

An objective belongs to the side whose ground unit last entered it. At the start the defender holds them all.

## Controls

| Action | Input |
|---|---|
| Select a unit | Click it |
| Move | Click a highlighted hex |
| Attack | Click an enemy in range, check the preview, then confirm (click again or Enter) |
| Next unit | Space |
| End turn | "Fine turno" button or Enter |
| Undo moves (back to the last attack) | Ctrl+Z (or menu ☰ → "Annulla") |
| Cancel / deselect | Esc |
| Pan the map | Drag, or middle mouse button |
| Zoom | Mouse wheel or the +/− buttons |

The menu (☰, top right) also toggles ZOC (*zone of control*), supply and coordinate overlays, animations, and starts a new game ("Nuova partita…").

Hover a hex to inspect its units in the "Inspect" panel. The game saves automatically at the end of each turn.

## Turn sequence

Each turn, the first side plays all its units, then the other side. At the end of a full turn a summary shows losses and objectives held.

A unit can, during its side's turn:

- move one or more times, until it has no movement points (MP) left;
- attack once. Attacking ends its movement.

## Units

Each unit has a **strength** from 1 to 10. Losses reduce it; at 0 the unit is destroyed. A unit at strength 1 cannot attack and has half its MP.

Each unit has a **mobility** type (tracked, wheeled, foot, air), which sets its MP cost per terrain, and a **target class** (armored, unarmored, air). Attack values differ by target class: check the unit card before attacking.

| Unit | Notes |
|---|---|
| Armor | Strong attack against armored targets. |
| Mechanized / Motorized / Light infantry | Can dig in. Light infantry moves on foot. |
| Recon | Fast; ignores enemy ZOC. |
| Self-propelled artillery | Range 3. Cannot attack after moving. |
| Tactical missiles | Artillery with range 5. |
| HQ | Extends supply around itself when in supply. |
| Special forces | Ignore enemy ZOC; last longer out of supply. |
| Paratroopers | No special rules yet. |
| Engineers | Dig in even after moving; cancel the entrenchment of adjacent enemies. |
| Attack helicopters, UAVs | Air units, see *Air domain*. |
| AA, SAM | Shoot at enemy air units, see *Air domain*. |
| Electronic warfare | Jams UAVs and hampers enemy artillery, see *Air domain*. |

## Movement

Entering a hex costs MP depending on terrain and the unit's mobility. Impassable terrain (deep water) cannot be entered.

**Zone of control (ZOC):** each ground unit controls the six hexes around it. A unit entering an enemy ZOC hex stops there. Recon and special forces ignore enemy ZOC.

One ground unit and one air unit may share a hex.

## Terrain

| Terrain | Effect |
|---|---|
| Clear, dirt | No modifiers. |
| Forest, hills, mountains | Slow movement, better defence. |
| Village, city | Better defence; city blocks line of sight. |
| Shallow water | Slow movement. |
| Deep water | Impassable. |
| Airport | Plain terrain for now. |

The unit card and the attack preview show the exact values.

## Entrenchment

Infantry that ends its turn without moving digs in and gets a defence bonus. Moving removes it.

## Combat

Select a unit and click an enemy in range: a preview shows the power ratio, the expected losses for both sides and every modifier. Confirm to resolve.

- Losses depend on the attack/defence ratio, with some randomness.
- Adjacent defenders fire back; artillery firing from a distance takes no return fire.
- A defender losing heavily against a strong ratio retreats one hex. If it cannot retreat, it loses an extra step.
- After a won attack you may advance into the vacated hex (optional).

### Support fire

Friendly units nearby help automatically:

- **Flanking:** up to 2 other units adjacent to the target add +15% each to the attack. They count as having attacked.
- **Defensive support:** 1 unit adjacent to the defender adds +15% to defence, once per enemy turn.
- **Artillery:** in range of the target, reduces its defensive bonus; in range of the attacker, a defensive barrage reduces the attack.

## Supply

Supply starts from **depots** (crate icons). A depot changes owner when an enemy ground unit enters it, like an objective.

- **Trunk:** from a friendly depot along roads (up to 12 hexes) and railways (unlimited).
- **Last mile:** from the trunk, up to 4 MP of wheeled movement cost.
- **HQ:** an HQ that is itself in supply extends it by 4 MP around its hex. HQs do not chain.
- Bad weather reduces the ranges.

Enemy units and unoccupied enemy ZOC cut the line, so blocking a road or railway can isolate units far behind it.

Roads and railways crossing water are **bridges**: ground units can only cross them along the route, and may stop on them.

Out of supply:

1. **First turn:** attack halved, −1 MP.
2. **From the second turn:** attack halved, defence reduced, MP halved, and the unit loses 1 strength per turn (never below 1).

Use the "Rifornimenti" overlay to see the network.

## Air domain *(work in progress)*

Air units (helicopters, UAVs) sit in the air slot of a hex, above any ground unit. They ignore terrain and ZOC, exert no ZOC, cannot capture objectives, never retreat and are always supplied.

- **Helicopters:** strong against ground targets; must stay over friendly or empty hexes. Less effective against targets in forest or city.
- **UAVs:** may fly over enemy units. A UAV above an enemy gives +15% to friendly attacks on it.
- **AA / SAM:** fire at any enemy air unit that moves or attacks inside their radius (shown as an orange bubble), before it acts.
- **Electronic warfare:** inside its radius (purple bubble) enemy UAVs are jammed (half attack, no spotting) and enemy artillery firing into it is less accurate.

Every unit can attack air units, but ground units do so weakly.
