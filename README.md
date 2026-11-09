# SkyRoll

A 3D ball-rolling obstacle game for the browser. You drive a heavy ball along tracks, rails, pipes and giant machines built high above ten different worlds. You accelerate, brake, steer, jump and boost through loops, cannons, pinball rooms, magnetic storms and collapsing bridges. Built from scratch with **Three.js** (rendering) and **Rapier** (physics). All textures, models, sounds and music are generated in code, so the game ships no image or audio files.

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

You drive the ball. It sits still on the launch pad until you roll it, and you control its speed the whole way: build momentum, brake for timing obstacles, jump gaps and blockers anywhere, and burn boost to clear big jumps.

| Action | Keyboard | Touch (Stick mode, default) | Touch (Buttons mode) |
| --- | --- | --- | --- |
| Accelerate | `W` / `↑` | Automatic on touch screens (see *Auto-accelerate*); with it off, push the floating stick up | Automatic |
| Brake / reverse | `S` / `↓` | Pull the stick down | BRAKE button |
| Steer | `A` / `D` or `←` / `→` | Stick left / right | ◀ ▶ buttons |
| Jump (anywhere, unless a section says NO JUMP) | `Space` | JUMP button | JUMP button |
| Boost (uses the boost meter) | `Shift` | BOOST button | BOOST button |
| Restart from the last checkpoint | `R` | Pause menu | Pause menu |
| Pause | `Esc` / `P` | Pause button | Pause button |

- **Air control**: you can steer, speed up and brake a little in the air, so you can fix a jump before you land.
- **Boost meter**: refills slowly on its own and quickly from tricks, perfect landings, coin streaks and boost pads. Yellow boost pads give a free burst; braking cancels it.
- **Settings** has *Touch controls* (Stick or Buttons) and *Auto-accelerate* (Auto: on for touch screens, off for keyboards; or force it ON or OFF). With auto-accelerate the ball rolls forward by itself and you brake to control the speed.
- **Level 1 teaches the controls through play**: on-screen hints appear as you need them (roll, jump, boost, brake).

### Scoring and rewards

- **Combo multiplier** (up to x8): every trick raises it. It drains after 4.5 seconds without a trick, and resets if you fall.
- **Tricks**:
  - perfect landings (land flat and centred after a big air)
  - close calls (slip past a moving hazard)
  - speed rush (keep a high speed)
  - coin streaks (10 coins in a row)
  - gems
  - knocking down structures
  - loops, cannon shots, ring flights
  - taking the sky route shortcut
  - escaping the chaser
  - clearing an endless zone
- **Stars**: 60% of coins gives 2 stars. 85% of coins with at most one fall gives 3 stars.
- **Results** show score, tricks, best combo, time bonus and flawless (no-fall) bonus.
- **Gems**: each level hides two purple gems, usually on the riskiest or secret line (high routes, hoops, side paths).
- **Checkpoints** are green gates. After a fall you are back at the last one in about a second, already rolling.

### Endless mode

The course is generated as you go and gets faster and harder.

- **Themed zones**: Machine Zone, Rush Hour, Air Time, Physics Playground, Nerves of Steel, Strange Skies, Spectacle and Overdrive. Each one changes the obstacle mix, and Rush Hour and Overdrive also raise the speed. A zone starts at a calm *zone gate*, which is a straight run or a gold-rush bonus room, and clearing a zone pays a reward.
- **Variety**:
  - an obstacle never repeats within 6 picks
  - a recent pair is never reused
  - a zone never comes back within 3
  - the track never crosses itself
- **One fall ends the run.** Distance, score, coins, tricks, best combo and zones cleared are tracked, and your best distance and score are saved.

Coins buy cosmetic balls in **Balls**. Every ball handles the same. Progress, records, unlocked balls, achievements and settings are saved in the browser's `localStorage`.

## Content

- **91 obstacle types**, plus the *Launch Bay* opening:
  - **18 set pieces**: Launch Cannon, The Chaser, Loop-the-Loop, Rotating World, Updraft Canyon, Ring Flight, The Giant Domino, Assembling Bridge, Boulder Run, Claw Machine, Gear Works, Pinball Room, Laser Sweep, Hydraulic Lift, Magnetic Storm, Wall Ride, Sky Route and Hyper Tunnel.
  - **73 obstacles** in six categories: Narrow Track (15), Moving (14), Jumps (11), Mechanical (12), Physics (10) and Special (11).

  Each type has its own geometry, motion, collision setup and difficulty rating. See `src/game/obstacles/`.
- **20 handcrafted levels** (`src/game/levels.js`), each with 12–17 obstacle encounters and at least 3 set pieces.
  - Levels: The Awakening, Magnetic Mayhem, The Domino Factory, Skyfall, Pinball Panic, The Rotating World, Speed Factory, Collapse Zone, Harbor Heist, Frozen Peaks, Laser Labyrinth, Carnival Coast, The Spiral Tower, Gravity Lab, Canyon Run, Machine Heart, Precision Master, The Mega Course, Impossible Structures and Final Roll.
  - Each level has its own environment, palette, checkpoints, two gems and shortcut or secret lines.
- **The opening (Level 1 and Final Roll)** is the *Launch Bay*:
  - READY / GO camera fly-in
  - a ring machine that powers up on GO
  - a boost ramp, then a sweeping barrier to jump
  - a kicker onto a spinning disc with a coin ring and a gem
- **A living world**:
  - giant animated background machinery (ring machines, gear towers, pistons, turbines, beacons)
  - boost trails and landing shockwaves
  - speed and air FOV kicks, a landing camera kick, and set-piece camera shots
- **Reactive audio**:
  - the music adds layers as the action intensifies
  - a boost roar, and sounds for mechanisms, cannons, rings, alarms and perfect landings
  - the rolling sound changes with speed and surface
- **10 environments**: Skyline City, Construction Zone, Sunset Coast, Neon District, Alpine Summit, Mega Factory, Cloud Kingdom, Pastel Plaza, Canyon Mesa and Night Harbor.
- **15 cosmetic balls** and **18 achievements**.
- **Graphics**:
  - PBR materials, soft shadows that follow the ball, image-based reflections, ACES tone mapping and fog
  - bloom (High) and ground-truth ambient occlusion (Ultra)
  - four quality presets: Low, Medium, High and Ultra

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

The tests use an autopilot that drives the ball through the real physics simulation, without rendering. It uses the same throttle, brake, jump and boost inputs a player has.

Build and serve the game (`npm run build && npm run preview`, or `npm run dev`), then run:

```bash
node tests/run-tests.mjs --url=http://localhost:4173/
```

This checks:

- the obstacle registry
- the level design rules: 12+ encounters and 3+ set pieces per level, unique sequences, every obstacle used, gem counts
- that no course overlaps itself
- a full autopilot playthrough of all 20 levels, reporting encounters per minute, falls, coins, tricks and best combo
- the endless rules (repeats, pairs, zone rotation) and autopilot endless runs on several seeds
- that saves persist across a reload

Other tools. Set the server with `URL=http://localhost:4173/` where needed.

- `node tests/obstacle-check.mjs`: the autopilot attempts every obstacle on its own.
- `node tests/input-play.mjs <outdir>`: plays Level 1 with real key presses (W, S, Space, Shift, A/D) and saves screenshots.
- `node tests/stuck.mjs 7`: lists where the autopilot falls in level 7.
- `node tests/trace.mjs level:6 8 0.1 '{"skipTo":385}'`: traces position and speed through a stretch of a level.
- `node tests/mobile.mjs <outdir>`: checks the phone layouts and touch controls.
- `node tests/perf.mjs`: measures frame times.
- `node tests/ui-walk.mjs <outdir>`: clicks through every screen and saves screenshots.
- `node tests/view.mjs level:7 120 out.png high`: renders one spot in a level.

## Developer URL options

- `?level=7`: jump straight into level 7.
- `?endless=1`: start an endless run.
- `?sandbox=pendulums,crushers&theme=neon`: test any obstacles.
- `?q=low|medium|high|ultra`: override graphics quality.
- `?bot=1`: let the autopilot drive.
- `?unlock=all`: unlock every level.
