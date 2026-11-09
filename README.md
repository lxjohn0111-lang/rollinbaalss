# SkyRoll

A 3D ball-rolling obstacle game for the browser. You steer a heavy ball along tracks, rails, pipes and machinery built high above ten different worlds. Built from scratch with **Three.js** (rendering) and **Rapier** (physics). All textures, models, sounds and music are generated in code, so the game ships no image or audio files.

## Quick start

Requires Node.js 18+.

```bash
npm install
```

```bash
npm run dev
```

Open the URL Vite prints (normally http://localhost:5173). To build a static version you can host anywhere:

```bash
npm run build
```

```bash
npm run preview
```

`dist/` can be served by any static web server. No install is needed on the player's side.

## How to play

The ball rolls forward on its own. You steer it, choose lanes, and time your jumps.

| Action | Desktop | Touch |
| --- | --- | --- |
| Steer | `A` / `D` or `←` / `→` | Hold the left/right buttons (or switch to *Drag* steering in Settings) |
| Jump (only in green **JUMP ZONE** sections) | `Space` | Jump button |
| Speed up / brake | `W` / `S` or `↑` / `↓` | n/a |
| Restart from the last checkpoint | `R` | Pause menu |
| Pause | `Esc` or `P` | Pause button |

- **Coins** are spread along every course. Collecting 60% gives 2 stars and 85% gives 3 stars (with at most one fall).
- **Gems**: each level hides two purple gems, usually on the riskiest line.
- **Structures**: brick walls, towers, dominoes and bowling pins are real physics objects. Knock enough of one down to earn a bonus.
- **Checkpoints**: green gates. If you fall, you respawn at the last one you passed.
- **Endless mode**: the course is generated as you go and gets faster and harder. One fall ends the run. Your best distance and score are saved.

Coins buy cosmetic balls in **Balls**. Every ball handles the same.

Progress, records, unlocked balls, achievements and settings are saved in the browser's `localStorage`.

## Content

- **73 obstacle types** in six categories: Narrow Track (15), Moving (14), Jumps (11), Mechanical (12), Physics (10), Special (11). Each one has its own geometry, motion, collision setup and difficulty rating. See `src/game/obstacles/`.
- **20 handcrafted levels** (`src/game/levels.js`). Each has its own environment, palette, obstacle sequence, checkpoints and two gems, and each of levels 1–18 introduces new obstacles.
- **10 environments**: Skyline City, Construction Zone, Sunset Coast, Neon District, Alpine Summit, Mega Factory, Cloud Kingdom, Pastel Plaza, Canyon Mesa, Night Harbor.
- **Endless mode** (`src/game/endless.js`):
  - difficulty ramps up with distance
  - never repeats an obstacle within 6 picks or reuses a recent pair
  - heading and elevation are controlled so the track never crosses itself
  - includes breathers, bonus runs and rare set pieces
- **15 cosmetic balls** and **18 achievements**.
- **Graphics**:
  - PBR materials, soft shadows following the ball, image-based reflections, ACES tone mapping, fog
  - bloom (High) and ground-truth ambient occlusion (Ultra)
  - four quality presets: Low, Medium, High, Ultra
- **Audio**: synthesized sound effects, speed-reactive rolling sound, and a step sequencer that plays different music for each environment.

## Project layout

```
src/
  core/       engine (renderer, post-processing), physics wrapper, input, audio, save system
  gfx/        procedural textures, materials, environments, particle effects
  game/       game loop, course builder, ball, camera, levels, endless, skins, achievements, autopilot
    obstacles/  obstacle library (track, moving, jumps, mechanical, physicsfx, special)
  ui/         menus, HUD, styles, icons
tests/        automated play-tests (Playwright + headless Chromium)
```

## Tests

The tests use an autopilot that drives the ball through the real physics simulation, without rendering.

Start a server (`npm run dev`, or `npm run build && npm run preview`), then run:

```bash
node tests/run-tests.mjs --url=http://localhost:5173/
```

This checks:

- the obstacle registry
- the level design rules: no back-to-back repeats, unique sequences, every obstacle used, gem counts
- that no course overlaps itself
- a full autopilot playthrough of all 20 levels
- the endless generator rules, plus autopilot endless runs on several seeds
- that saves persist across a reload

Other tools:

- `node tests/obstacle-check.mjs`: the autopilot attempts every obstacle on its own.
- `node tests/ui-walk.mjs <outdir>`: clicks through every screen and saves screenshots.
- `node tests/view.mjs level:7 120 out.png high`: renders one spot in a level.

## Developer URL options

- `?level=7`: jump straight into level 7.
- `?endless=1`: start an endless run.
- `?sandbox=pendulums,crushers&theme=neon`: test any obstacles.
- `?q=low|medium|high|ultra`: override graphics quality.
- `?bot=1`: let the autopilot drive.
- `?unlock=all`: unlock every level.
