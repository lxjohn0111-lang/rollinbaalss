// Obstacle registry: every section type with its metadata. Obstacles (kind 'obstacle') are the
// playable challenges counted by the variety system; connectors/structures glue them together.
import { STRUCTURE, TRACK } from './track.js';
import { MOVING } from './moving.js';
import { JUMPS } from './jumps.js';
import { MECHANICAL } from './mechanical.js';
import { PHYSICS } from './physicsfx.js';
import { SPECIAL } from './special.js';

export const REGISTRY = {};
const all = [...STRUCTURE, ...TRACK, ...MOVING, ...JUMPS, ...MECHANICAL, ...PHYSICS, ...SPECIAL];
for (const o of all) {
  if (REGISTRY[o.id]) throw new Error('Duplicate obstacle id ' + o.id);
  o.kind = o.kind || 'obstacle';
  REGISTRY[o.id] = o;
}

export const OBSTACLE_IDS = all.filter((o) => o.kind === 'obstacle').map((o) => o.id);
export const CATEGORIES = [...new Set(all.filter((o) => o.kind === 'obstacle').map((o) => o.category))];

export function obstacleInfo(id) { return REGISTRY[id]; }
