// The 20 handcrafted levels. Every level has its own environment, obstacle sequence, difficulty,
// checkpoints, two hidden gems and a finish. Connectors (runway/curve/slope) glue obstacles
// together; obstacle variety rules are validated by tests/run-tests.mjs.

const cp = ['checkpoint'];
const r = (len = 6, extra = {}) => ['runway', { len, ...extra }];
const c = (angle, extra = {}) => ['curve', { angle, ...extra }];
const sl = (dy, len = 16) => ['slope', { dy, len }];

export const LEVELS = [
  {
    id: 1, name: 'First Roll', theme: 'metropolis', speed: 9, difficulty: 1,
    tagline: 'Learn to steer between the skyscrapers',
    intro: ['slalom_gates', 'wave_track', 'brick_wall', 'gold_rush'],
    sections: [
      r(8, { coins: true }), ['slalom_gates', { gates: 4, gap: 8, open: 2.5 }], c(30),
      ['wave_track', { amp: 0.6, gem: true }], cp, ['brick_wall', { rows: 3 }], c(-30),
      ['gold_rush', { len: 30 }],
    ],
  },
  {
    id: 2, name: 'Rail Runner', theme: 'metropolis', speed: 9.5, difficulty: 2,
    tagline: 'Narrow rails high above the avenues',
    palette: { rail: '#1f7ae0', accent: '#d9261d' },
    intro: ['balance_beam', 'twin_rails', 'step_pyramid', 's_bend', 'domino_run', 'cliff_ledge'],
    sections: [
      r(6), ['balance_beam', { len: 18, w: 1.4 }], c(30), ['twin_rails', { gem: true, wb: 0.8 }], cp,
      ['step_pyramid', { steps: 5 }], ['s_bend', { w: 2.0, amp: 2.2 }], c(-40), ['domino_run'], cp,
      ['cliff_ledge', { side: -1, len: 28 }],
    ],
  },
  {
    id: 3, name: 'Pipe Trouble', theme: 'construction', speed: 9.5, difficulty: 2,
    tagline: 'Red pipes, steel girders and a long way down',
    intro: ['pipe_bundle', 'zigzag', 'banked_turn', 'tower_topple', 'spiral_down', 'camber_run'],
    sections: [
      r(6), ['pipe_bundle', { gem: true, spread: 1.2 }], c(35), ['zigzag', { zigs: 4, w: 1.9 }], cp,
      ['banked_turn', { angle: -90 }], ['tower_topple', { towers: 4 }], r(4), ['spiral_down', { turns: 1, dir: 1, gem: true }], cp,
      ['camber_run', { tilt: 16 }],
    ],
  },
  {
    id: 4, name: 'The First Jump', theme: 'coastal', speed: 10, difficulty: 3,
    tagline: 'Ramps, springs and open air over the bay',
    intro: ['launch_ramp', 'twin_gaps', 'spring_pads', 'sky_drop', 'hurdles', 'mega_hoop'],
    sections: [
      r(6), ['launch_ramp', { gap: 6 }], c(-30), ['twin_gaps'], cp, ['spring_pads', { count: 1, gem: true }],
      ['sky_drop', { drop: 6 }], ['hurdles', { count: 4 }], cp, c(30), ['mega_hoop', { gem: true }],
    ],
  },
  {
    id: 5, name: 'Moving Machinery', theme: 'factory', speed: 10, difficulty: 3,
    tagline: 'Everything in this hall wants to hit you',
    intro: ['cross_traffic', 'piston_punch', 'rotor_cross', 'wiper_arms', 'boom_gates', 'pendulums'],
    sections: [
      r(6), ['cross_traffic', { rows: 4, speed: 0.9 }], c(30), ['piston_punch', { count: 4 }], cp,
      ['rotor_cross', { speed: 0.9, gemAt: [2.4, 1.0, 7.8] }], ['wiper_arms', { count: 2, speed: 1.1 }], c(-30), ['boom_gates'], cp,
      ['pendulums', { count: 3, gemAt: [0, 1.0, 16] }],
    ],
  },
  {
    id: 6, name: 'Split Decision', theme: 'architect', speed: 10, difficulty: 3,
    tagline: 'Every route is a choice between risk and reward',
    intro: ['fork_paths', 'broken_bridge', 'checker_holes', 'sliding_lanes', 'swing_bridges'],
    sections: [
      r(6), ['fork_paths'], c(35), ['broken_bridge'], cp, ['checker_holes'], ['sliding_lanes', { count: 3 }], c(-35),
      ['swing_bridges'], cp, ['cliff_ledge', { side: 1 }],
    ],
  },
  {
    id: 7, name: 'Block Breaker', theme: 'desert', speed: 10, difficulty: 2,
    tagline: 'Smash, topple and strike your way across the mesa',
    intro: ['bowling', 'moguls', 'steep_climb'],
    sections: [
      r(6), ['brick_wall', { rows: 5, bonus: 20 }], c(30), ['bowling', { gemAt: [0, 1.0, 38] }], ['tower_topple', { towers: 6 }], cp,
      ['moguls', { gemAt: [1.6, 1.4, 18] }], ['domino_run', { count: 30 }], c(-30), ['steep_climb'], cp, ['brick_wall', { rows: 4, cols: 9 }],
    ],
  },
  {
    id: 8, name: 'The Rotating Maze', theme: 'neon', speed: 10, difficulty: 4,
    tagline: 'Spinning steel under the neon glow',
    intro: ['turntable', 'propeller', 'disc_gate', 'shifting_maze', 'log_roller'],
    sections: [
      r(6), ['turntable', { gemAt: [2.6, 1.0, 8.4] }], c(40), ['propeller'], cp, ['disc_gate'], ['rotor_cross', { speed: 1.2, dir: -1 }], c(-40),
      ['shifting_maze'], cp, ['log_roller', { count: 2, gemAt: [0, 1.2, 15] }],
    ],
  },
  {
    id: 9, name: 'Sky Bridge', theme: 'clouds', speed: 10, difficulty: 4,
    tagline: 'Rope, cable and sky - nothing below but clouds',
    intro: ['rope_bridge', 'swing_platforms', 'trampolines', 'pillar_hop'],
    sections: [
      r(6), ['rope_bridge', { gem: true }], c(-30), ['balance_beam', { len: 28, w: 1.05 }], cp, ['swing_platforms'],
      ['trampolines', { gem: true }], c(30), ['twin_rails', { wb: 0.65, wa: 1.0 }], cp, ['pillar_hop'],
    ],
  },
  {
    id: 10, name: 'Industrial Chaos', theme: 'factory', speed: 10, difficulty: 5,
    tagline: 'Presses, hammers and runaway barrels',
    palette: { machine: '#e8541e', accent: '#f3b90f' },
    intro: ['crushers', 'conveyor_run', 'hammer_slam', 'paddle_wheel', 'barrel_avalanche', 'piston_field', 'squeeze_walls'],
    sections: [
      r(6), ['crushers'], c(35), ['conveyor_run', { gemAt: [0, 1.0, 20] }], cp, ['hammer_slam'], ['paddle_wheel'], c(-35),
      ['barrel_avalanche', { gemAt: [1.6, 2.4, 22] }], cp, ['piston_field'], ['squeeze_walls'],
    ],
  },
  {
    id: 11, name: 'The Conveyor', theme: 'harbor', speed: 10, difficulty: 5,
    tagline: 'Belts, retracting rails and a spinning vortex at the docks',
    intro: ['flip_flop', 'retract_rails', 'wobble_plates', 'vortex_tunnel'],
    sections: [
      r(6), ['conveyor_run', { seq: ['left', 'right', 'back', 'left', 'fwd'] }], c(30), ['flip_flop', { gemAt: [-1.1, 1.0, 12] }], cp,
      ['retract_rails'], ['wobble_plates'], c(-30), ['cross_traffic', { rows: 5, speed: 1.25 }], cp, ['vortex_tunnel', { gem: true }],
    ],
  },
  {
    id: 12, name: 'Tilted World', theme: 'alpine', speed: 10, difficulty: 5,
    tagline: 'Nothing on this mountain is level',
    intro: ['seesaws', 'ice_rink', 'ski_jump'],
    sections: [
      r(6), ['camber_run', { tilt: 23 }], c(-40), ['seesaws', { gemAt: [0, 1.4, 12] }], cp, ['wobble_plates', { tilt: 16 }],
      ['banked_turn', { angle: 100 }], ['ice_rink'], cp, ['ski_jump', { gem: true }], ['s_bend', { w: 1.7 }],
    ],
  },
  {
    id: 13, name: 'The Spiral', theme: 'coastal', speed: 10, difficulty: 5,
    tagline: 'Corkscrews and hairpins high above the harbour',
    palette: { rail: '#ff5f6d', deck: '#e8c08a' },
    intro: ['hairpin', 'hoop_run'],
    sections: [
      r(6), ['spiral_down', { turns: 1.25, dir: 1, gem: true }], ['hairpin', { angle: -110, dy: -2 }], cp, ['s_bend', { amp: 3 }],
      ['pipe_bundle', { spread: 1.6 }], ['banked_turn', { angle: 80 }], cp, ['spiral_down', { turns: 1, dir: -1, drop: 7 }],
      ['hoop_run', { gemAt: [0, 1.0, 39] }],
    ],
  },
  {
    id: 14, name: 'Gravity Shift', theme: 'clouds', speed: 10, difficulty: 6,
    tagline: 'Magnets, fans and floating platforms in the stratosphere',
    palette: { rail: '#7b6cf6', accent: '#ff9ad5' },
    intro: ['low_gravity', 'magnet_orbs', 'wind_fans', 'pinball'],
    sections: [
      r(6), ['low_gravity', { gem: true }], c(30), ['magnet_orbs'], cp, ['trampolines', { count: 4 }], ['wind_fans'], c(-30),
      ['spring_pads', { count: 2 }], cp, ['pinball', { gemAt: [-2.4, 1.0, 20] }],
    ],
  },
  {
    id: 15, name: 'The Collapse', theme: 'desert', speed: 10, difficulty: 6,
    tagline: 'The canyon floor is falling away beneath you',
    palette: { deck: '#d8a36a', rail: '#e8541e' },
    intro: ['crumble_floor', 'tar_pit'],
    sections: [
      r(6), ['crumble_floor'], c(-30), ['sky_drop', { drop: 8, gem: true }], ['tar_pit'], cp, ['swing_bridges', { period: 4.0 }],
      ['checker_holes', { rows: 13, fill: 0.2, gemAt: [0, 1.0, 20] }], c(30), ['retract_rails', { period: 3.2 }], cp, ['crumble_floor', { rows: 11, cracked: 0.5 }],
    ],
  },
  {
    id: 16, name: 'High-Speed Run', theme: 'neon', speed: 12, difficulty: 6,
    tagline: 'Boost strips, lasers and a tunnel of light',
    palette: { rail: '#19f6ff', accent: '#ff2bd6' },
    intro: ['turbo_slalom', 'neon_tunnel', 'laser_grid'],
    sections: [
      r(8), ['turbo_slalom', { gemAt: [0, 1.0, 30] }], c(30, { r: 22 }), ['launch_ramp', { gap: 8 }], cp, ['neon_tunnel'], ['mega_hoop', { gap: 18, gem: true }],
      c(-30, { r: 22 }), ['wave_track', { amp: 1.3 }], cp, ['laser_grid', { period: 2.6 }],
    ],
  },
  {
    id: 17, name: 'Precision Master', theme: 'alpine', speed: 10, difficulty: 7,
    tagline: 'Thin beams over the glacier - one slip and it is over',
    palette: { rail: '#2f7de1' },
    intro: ['precision_hops', 'track_transfer'],
    sections: [
      r(6), ['balance_beam', { w: 0.9, len: 30 }], c(30), ['zigzag', { w: 1.4, angle: 38 }], cp, ['precision_hops', { gem: true, w: 2.0 }],
      ['s_bend', { w: 1.35 }], c(-30), ['track_transfer', { side: -1 }], cp, ['twin_rails', { wa: 0.9, wb: 0.6, gem: true }],
    ],
  },
  {
    id: 18, name: 'The Mega Course', theme: 'construction', speed: 10.5, difficulty: 8,
    tagline: 'Every machine on the site, switched on at once',
    palette: { rail: '#e8541e', accent: '#f2a20c' },
    intro: ['moving_landing'],
    sections: [
      r(6), ['moving_landing'], ['crushers', { period: 2.2 }], c(30), ['pendulums', { count: 4, speed: 0.7 }], ['swing_bridges', { period: 4.0 }], cp,
      ['conveyor_run', { seq: ['right', 'back', 'left', 'right'] }], ['rotor_cross', { speed: 1.3 }], ['trampolines', { count: 4 }], cp,
      ['cross_traffic', { rows: 5, speed: 1.35 }], ['ski_jump', { gem: true }], c(-30), ['shifting_maze', { period: 2.8 }], ['gold_rush', { len: 26 }],
    ],
  },
  {
    id: 19, name: 'Impossible Structures', theme: 'architect', speed: 10.5, difficulty: 9,
    tagline: 'Architecture that should not stand - and rolls you off',
    palette: { rail: '#7b6cf6', accent: '#ff6f91', deck: '#f5d0a0' },
    intro: [],
    sections: [
      r(6), ['vortex_tunnel', { rock: 20 }], ['sky_drop', { drop: 7 }], ['pipe_bundle', { spread: 1.8 }], cp, ['log_roller', { count: 3, speed: 1.9 }],
      ['disc_gate', { count: 3 }], c(-30), ['low_gravity', { gem: true, count: 3 }], ['swing_platforms', { count: 5 }], cp,
      ['retract_rails', { period: 3.0 }], ['hammer_slam', { count: 5 }], ['cliff_ledge', { side: 1, len: 30 }],
    ],
  },
  {
    id: 20, name: 'Final Roll', theme: 'metropolis', speed: 11, difficulty: 10,
    tagline: 'The ultimate run across the skyline',
    palette: { rail: '#d9261d', accent: '#ffcf33', deck: '#e0b47e' },
    intro: [],
    sections: [
      r(8), ['launch_ramp', { gap: 8, boost: 1.9 }], ['laser_grid', { period: 2.4 }], c(30), ['spiral_down', { turns: 1, dir: 1 }], cp,
      ['crushers', { rows: 4 }], ['flip_flop', { count: 6 }], ['propeller', { count: 3 }], cp, ['precision_hops', { count: 7 }],
      ['squeeze_walls', { rows: 5, speed: 1.6 }], c(-30), ['mega_hoop', { gem: true, gap: 18 }], cp, ['shifting_maze', { rows: 9, period: 2.8 }],
      ['paddle_wheel', { count: 3 }], ['gold_rush', { len: 40 }],
    ],
  },
];

export function buildLevelDefs(l) {
  let seed = l.id * 1013;
  return [
    { type: 'start' },
    ...l.sections.map(([type, params]) => ({ type, params: { ...(params || {}) }, seed: seed++ })),
    { type: 'finish' },
  ];
}

export const TOTAL_GEMS = LEVELS.length * 2;
