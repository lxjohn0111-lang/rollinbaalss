// The 20 handcrafted levels. Each has its own environment, identity, dense obstacle sequence
// (12-18 encounters with 3-5 set pieces), checkpoints, two hidden gems and a finish.
// Variety rules are validated by tests/run-tests.mjs.

const cp = ['checkpoint'];
const c = (angle, extra = {}) => ['curve', { angle, ...extra }];
const sl = (dy, len = 14) => ['slope', { dy, len, coins: false }];

export const LEVELS = [
  {
    id: 1, name: 'The Awakening', theme: 'metropolis', speed: 10, difficulty: 1,
    start: 'launch_bay',
    tagline: 'The machines wake up - learn to roll, jump, brake and boost',
    sections: [
      ['slalom_gates', { gates: 4, gap: 7, open: 2.4 }], ['brick_wall', { rows: 3 }], c(30), ['wave_track', { amp: 0.7 }],
      ['sliding_lanes', { count: 3, speed: 1.0 }], cp, ['hurdles', { count: 3 }], ['assembling_bridge', {}], c(-30),
      ['launch_ramp', { gap: 6, gem: true }], ['domino_run', {}], cp, ['rotor_cross', { speed: 0.8 }], ['hydraulic_lift', {}],
      ['gold_rush', { len: 24, gem: false }], ['ring_flight', {}],
    ],
  },
  {
    id: 2, name: 'Magnetic Mayhem', theme: 'neon', speed: 10, difficulty: 2,
    tagline: 'Metal rails, magnetic storms and grinding gears',
    sections: [
      ['balance_beam', { len: 20, w: 1.3 }], ['magnet_orbs', {}], c(30), ['pipe_bundle', { spread: 1.2, gem: true }],
      ['cross_traffic', { rows: 4, speed: 0.9 }], cp, ['magnetic_storm', {}], ['zigzag', { w: 1.8 }], ['conveyor_run', {}],
      ['gear_train', {}], cp, c(-30), ['twin_rails', {}], ['wiper_arms', { count: 2, speed: 1.1 }], ['sky_route', { side: 1 }],
      ['piston_punch', { count: 4 }],
    ],
  },
  {
    id: 3, name: 'The Domino Factory', theme: 'factory', speed: 10, difficulty: 2,
    tagline: 'Topple, smash and trigger chain reactions on the factory floor',
    palette: { machine: '#e8541e', accent: '#f3b90f' },
    sections: [
      ['domino_run', {}], ['conveyor_run', { seq: ['back', 'left', 'right', 'fwd'] }], ['tower_topple', {}], ['domino_bridge', {}], cp,
      ['claw_drop', {}], ['piston_field', {}], ['bowling', { gemAt: [0, 1, 38] }], ['crushers', { period: 2.6 }], cp,
      ['brick_wall', { rows: 5 }], ['boulder_run', {}], ['boom_gates', {}], ['pinball', { gemAt: [-2.4, 1, 20] }],
      ['gold_rush', { len: 24, gem: false }],
    ],
  },
  {
    id: 4, name: 'Skyfall', theme: 'clouds', speed: 10, difficulty: 3,
    tagline: 'Jump between floating islands high above the clouds',
    sections: [
      ['launch_ramp', { gap: 7 }], ['trampolines', { gem: true }], ['rope_bridge', {}], ['updrafts', {}], cp,
      ['precision_hops', { count: 5 }], ['sky_drop', { drop: 7 }], ['cannon', {}], ['swing_platforms', { count: 4 }], cp,
      ['pillar_hop', {}], ['spring_pads', { count: 1 }], ['ring_flight', { rings: [[0, 4.2, 9], [-0.6, 4.6, 18], [0.5, 4.4, 27], [0, 3.9, 36]] }],
      ['twin_gaps', {}], ['mega_hoop', { gem: true }],
    ],
  },
  {
    id: 5, name: 'Pinball Panic', theme: 'architect', speed: 10, difficulty: 3,
    tagline: 'A giant arcade machine of bumpers, flippers and springs',
    palette: { rail: '#ff6f91', accent: '#7b6cf6' },
    sections: [
      ['hoop_run', {}], ['pinball', {}], c(30), ['flip_flop', {}], ['pinball_room', {}], cp,
      ['turntable', {}], ['boom_gates', {}], ['spring_pads', { count: 1, gem: true }], ['propeller', {}], cp, c(-30),
      ['bowling', {}], ['disc_gate', {}], ['claw_drop', { count: 2 }], ['trampolines', { count: 4 }], ['tower_topple', { towers: 5, gemAt: [0, 1, 30] }],
    ],
  },
  {
    id: 6, name: 'The Rotating World', theme: 'construction', speed: 10, difficulty: 4,
    tagline: 'Tubes, gears and tracks that spin around you',
    sections: [
      ['rotating_world', {}], ['log_roller', { count: 2 }], ['turntable', { dir: -1 }], cp,
      ['vortex_tunnel', { gem: true }], ['gear_train', {}], ['spiral_down', { turns: 1, dir: 1 }], ['wobble_plates', {}], cp,
      ['disc_gate', { count: 2 }], ['rotor_cross', { speed: 1.1, dir: -1 }], ['camber_run', { tilt: 20 }], ['propeller', { count: 2 }],
      ['loop', { gemAt: [2, 6.2, 14] }],
    ],
  },
  {
    id: 7, name: 'Speed Factory', theme: 'factory', speed: 11, difficulty: 4,
    tagline: 'Boost tunnels, loops and barriers at full throttle',
    sections: [
      ['turbo_slalom', {}], ['launch_ramp', { gap: 8 }], ['hyper_tunnel', {}], cp,
      ['squeeze_walls', { rows: 4 }], ['loop', {}], ['wiper_arms', { count: 3, speed: 1.3 }], ['conveyor_run', { seq: ['fwd', 'left', 'fwd', 'right', 'fwd'] }], cp,
      ['laser_grid', { period: 2.4 }], ['ski_jump', { gem: true }], ['cross_traffic', { rows: 5, speed: 1.3 }], ['mega_hoop', { gem: true }],
      ['gold_rush', { len: 24, gem: false }],
    ],
  },
  {
    id: 8, name: 'Collapse Zone', theme: 'desert', speed: 10, difficulty: 5,
    tagline: 'The canyon is falling apart - and something is chasing you',
    palette: { deck: '#d8a36a', rail: '#e8541e' },
    sections: [
      ['crumble_floor', {}], ['broken_bridge', {}], ['chaser', {}], cp,
      ['checker_holes', { gemAt: [0, 1, 20] }], ['retract_rails', {}], ['assembling_bridge', { wave: 1.6 }], ['sky_drop', { drop: 7 }], cp,
      ['swing_bridges', {}], ['tar_pit', {}], ['flip_flop', {}], ['boulder_run', {}], ['cliff_ledge', { side: 1 }],
    ],
  },
  {
    id: 9, name: 'Harbor Heist', theme: 'harbor', speed: 10, difficulty: 5,
    tagline: 'Cranes, cannons and cargo at the docks after dark',
    sections: [
      ['cross_traffic', {}], ['claw_drop', { count: 3 }], ['conveyor_run', { seq: ['right', 'back', 'left', 'right'] }], cp,
      ['cannon', {}], ['swing_bridges', { period: 4.2 }], ['retract_rails', {}], ['pendulums', { count: 3 }], cp,
      ['hydraulic_lift', { rise: 5 }], ['magnet_orbs', {}], ['fork_paths', {}], ['sweep_lasers', {}], ['gold_rush', { len: 28 }],
    ],
  },
  {
    id: 10, name: 'Frozen Peaks', theme: 'alpine', speed: 10, difficulty: 5,
    tagline: 'Ice, half-pipes and avalanches on the summit',
    sections: [
      ['ice_rink', {}], ['banked_turn', { angle: -90 }], ['seesaws', {}], cp, ['wall_ride', {}], ['ski_jump', { gem: true }],
      ['rope_bridge', {}], ['camber_run', { tilt: 22 }], cp, ['boulder_run', {}], ['s_bend', { w: 1.8 }], ['updrafts', {}],
      ['hairpin', { angle: 90 }], ['spring_pads', { count: 2, gem: true }],
    ],
  },
  {
    id: 11, name: 'Laser Labyrinth', theme: 'neon', speed: 10, difficulty: 6,
    tagline: 'Read the beams, time the gaps, trust nothing',
    palette: { rail: '#19f6ff', accent: '#ff2bd6' },
    sections: [
      ['laser_grid', {}], ['shifting_maze', {}], ['sweep_lasers', {}], cp, ['slalom_gates', { gates: 6, open: 1.9 }], ['hammer_slam', {}],
      ['disc_gate', { count: 2, gemAt: [0, 1.0, 12] }], ['neon_tunnel', { gem: true }], cp, ['boom_gates', {}], ['piston_punch', { count: 5 }],
      ['flip_flop', {}], ['hyper_tunnel', { fins: 8 }], ['crushers', {}],
    ],
  },
  {
    id: 12, name: 'Carnival Coast', theme: 'coastal', speed: 10, difficulty: 5,
    tagline: 'Hoops, springs and stunts on the sunset boardwalk',
    palette: { rail: '#ff5f6d', deck: '#e8c08a' },
    sections: [
      ['hoop_run', {}], ['trampolines', { count: 4 }], ['step_pyramid', { steps: 5 }], ['bowling', {}], cp, ['spring_pads', { count: 1 }], ['pinball_room', {}],
      ['mega_hoop', { gem: true }], cp, ['turntable', {}], ['rope_bridge', { gem: true }], ['sliding_lanes', { count: 4 }], ['wobble_plates', {}], ['ring_flight', {}], ['domino_run', {}],
    ],
  },
  {
    id: 13, name: 'The Spiral Tower', theme: 'construction', speed: 10, difficulty: 6,
    tagline: 'Corkscrew down the tower, ride the lifts back up',
    palette: { rail: '#e8541e', accent: '#f2a20c' },
    sections: [
      ['spiral_down', { turns: 1.25, dir: 1, gem: true }], ['hairpin', { angle: -110, dy: -2 }], ['hydraulic_lift', { rise: 6 }], cp,
      ['s_bend', { amp: 3 }], ['pipe_bundle', { spread: 1.6 }], ['banked_turn', { angle: 80 }], ['steep_climb', {}], cp,
      ['spiral_down', { turns: 1, dir: -1, drop: 7 }], ['zigzag', {}], ['wiper_arms', {}], ['vortex_tunnel', {}], ['hoop_run', { gemAt: [0, 1, 39] }],
    ],
  },
  {
    id: 14, name: 'Gravity Lab', theme: 'clouds', speed: 10, difficulty: 6,
    tagline: 'Where gravity, wind and magnetism are just suggestions',
    palette: { rail: '#7b6cf6', accent: '#ff9ad5' },
    sections: [
      ['low_gravity', { gem: true }], ['magnet_orbs', {}], ['updrafts', { cols: [{ x: 1.2, len: 12 }, { x: -1.2, len: 13 }] }], cp,
      ['wind_fans', {}], ['swing_platforms', { count: 4 }], ['trampolines', { count: 4 }], ['loop', {}], cp, ['ice_rink', {}], ['magnetic_storm', { period: 2.2 }], ['spring_pads', { count: 2 }],
      ['pinball', { gemAt: [-2.4, 1, 20] }], ['ring_flight', {}],
    ],
  },
  {
    id: 15, name: 'Canyon Run', theme: 'desert', speed: 10.5, difficulty: 7,
    tagline: 'Outrun the roller, dodge the boulders, cross the crumbling mesa',
    sections: [
      ['boulder_run', {}], ['tar_pit', {}], ['moguls', {}], ['chaser', { speed: 9 }], cp, ['ski_jump', {}], ['sky_drop', { drop: 8, gem: true }],
      ['crumble_floor', {}], ['retract_rails', { period: 3.2 }], cp, ['assembling_bridge', {}], ['cannon', { dist: 34, rise: 4 }],
      ['checker_holes', { rows: 13, fill: 0.2 }], ['swing_bridges', { period: 4.0 }], ['cliff_ledge', { side: -1 }],
    ],
  },
  {
    id: 16, name: 'Machine Heart', theme: 'factory', speed: 10.5, difficulty: 7,
    tagline: 'The beating heart of the factory - every piston is live',
    palette: { machine: '#e8541e', accent: '#f3b90f' },
    sections: [
      ['hammer_slam', { count: 5 }], ['crushers', { rows: 4 }], ['paddle_wheel', { count: 3 }], cp, ['gear_train', { count: 4 }],
      ['piston_punch', { count: 6 }], ['pendulums', { count: 4, speed: 0.7 }], ['claw_drop', { count: 4 }], cp,
      ['rotor_cross', { speed: 1.3 }], ['squeeze_walls', { rows: 5, speed: 1.6 }], ['conveyor_run', {}], ['barrel_avalanche', { gemAt: [1.6, 2.4, 22] }],
      ['mega_hoop', { gem: true }],
    ],
  },
  {
    id: 17, name: 'Precision Master', theme: 'alpine', speed: 10, difficulty: 8,
    tagline: 'Thin beams over the glacier - one slip and it is over',
    palette: { rail: '#2f7de1' },
    sections: [
      ['balance_beam', { w: 0.9, len: 30 }], ['zigzag', { w: 1.4, angle: 38 }], ['precision_hops', { gem: true, w: 2.0 }], cp,
      ['s_bend', { w: 1.35 }], ['twin_rails', { wa: 0.9, wb: 0.6, gem: true }], ['track_transfer', { side: -1 }], ['wall_ride', {}], cp,
      ['pillar_hop', {}], ['vortex_tunnel', { rock: 20 }], ['magnetic_storm', { force: 19 }], ['gear_train', {}], ['sweep_lasers', {}],
    ],
  },
  {
    id: 18, name: 'The Mega Course', theme: 'construction', speed: 10.5, difficulty: 8,
    tagline: 'Every machine on the site, switched on at once',
    sections: [
      ['moving_landing', {}], ['crushers', { period: 2.2 }], ['pendulums', { count: 4 }], ['swing_bridges', { period: 4.0 }], cp,
      ['conveyor_run', { seq: ['right', 'back', 'left', 'right'] }], ['loop', {}], ['rotor_cross', { speed: 1.3 }], ['trampolines', { count: 4 }], cp,
      ['claw_drop', {}], ['ski_jump', { gem: true }], ['shifting_maze', { period: 2.8 }], ['chaser', { speed: 9.2 }], ['boulder_run', {}], cp,
      ['pinball_room', {}], ['cannon', {}], ['gold_rush', { len: 26 }],
    ],
  },
  {
    id: 19, name: 'Impossible Structures', theme: 'architect', speed: 10.5, difficulty: 9,
    tagline: 'Architecture that should not stand - and rolls you off',
    palette: { rail: '#7b6cf6', accent: '#ff6f91', deck: '#f5d0a0' },
    sections: [
      ['vortex_tunnel', { rock: 20 }], ['sky_drop', { drop: 7 }], ['pipe_bundle', { spread: 1.8 }], ['rotating_world', { speed: 0.55 }], cp,
      ['log_roller', { count: 3, speed: 1.9 }], ['disc_gate', { count: 3 }], ['assembling_bridge', {}], ['low_gravity', { gem: true, count: 3 }], cp,
      ['swing_platforms', { count: 5 }], ['retract_rails', { period: 3.0 }], ['hammer_slam', { count: 5 }], ['updrafts', {}], ['cliff_ledge', { side: 1, len: 30 }],
    ],
  },
  {
    id: 20, name: 'Final Roll', theme: 'metropolis', speed: 11, difficulty: 10,
    start: 'launch_bay', startParams: { gem: false },
    tagline: 'The ultimate run across the skyline',
    palette: { rail: '#d9261d', accent: '#ffcf33', deck: '#e0b47e' },
    sections: [
      ['launch_ramp', { gap: 8, boost: 1.9 }], ['laser_grid', { period: 2.4 }], ['chaser', { speed: 9.5 }], cp, ['spiral_down', { turns: 1, dir: 1 }],
      ['crushers', { rows: 4 }], ['flip_flop', { count: 6 }], ['propeller', { count: 3 }], cp, ['hyper_tunnel', {}], ['precision_hops', { count: 7 }],
      ['squeeze_walls', { rows: 5, speed: 1.6 }], ['wall_ride', {}], cp, ['loop', {}], ['mega_hoop', { gem: true, gap: 18 }],
      ['shifting_maze', { rows: 9, period: 2.8 }], ['paddle_wheel', { count: 3 }], ['ring_flight', {}], ['gold_rush', { len: 40 }],
    ],
  },
];

export function buildLevelDefs(l) {
  let seed = l.id * 1013;
  return [
    { type: l.start || 'start', params: { ...(l.startParams || {}) } },
    ...l.sections.map(([type, params]) => ({ type, params: { ...(params || {}) }, seed: seed++ })),
    { type: 'finish' },
  ];
}

export const TOTAL_GEMS = LEVELS.length * 2;
void sl;
