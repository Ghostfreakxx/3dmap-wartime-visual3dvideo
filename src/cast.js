// The armies (instanced) and the named "hero" characters used in close-ups.
import * as THREE from 'three';
import { Squad } from './army.js';
import { makeHero, makeHorse, COL } from './characters.js';
import { LAYOUT } from './world.js';
import { inked, toon } from './toon.js';

const C = THREE;
const E = LAYOUT.englishLine, F = LAYOUT.frenchLine;

// zones kept clear of instanced soldiers so the hero characters can stand there
export const HERO_ZONES = {
  archers: { x0: 21, x1: 33, z0: 17, z1: 26 },
  french: { x0: -5, x1: 5, z0: -27, z1: -20 },
};
const inZone = (z) => (x, zz) => x > z.x0 && x < z.x1 && zz > z.z0 && zz < z.z1;

export function buildArmies(scene) {
  const S = (cfg) => new Squad(cfg, scene);
  const english = [
    S({ name: 'archersL', type: 'archer', tabard: 'stgeorge', center: [-28, E], rows: 6, cols: 34, spacing: [0.95, 1.1], yaw: Math.PI, seed: 1, banners: 2, bannerKind: 'stgeorge' }),
    S({ name: 'archersR', type: 'archer', tabard: 'stgeorge', center: [28, E], rows: 6, cols: 34, spacing: [0.95, 1.1], yaw: Math.PI, seed: 2, banners: 2, bannerKind: 'stgeorge', exclude: inZone(HERO_ZONES.archers) }),
    S({ name: 'menAtArms', type: 'billman', tabard: 'royal', center: [0, E + 1], rows: 5, cols: 22, spacing: [1.0, 1.1], yaw: Math.PI, seed: 3, banners: 3, bannerKind: 'royal' }),
    S({ name: 'reserve', type: 'billman', tabard: 'stgeorge', center: [0, 54], rows: 4, cols: 16, spacing: [1.1, 1.2], yaw: Math.PI, seed: 4, banners: 1, bannerKind: 'stgeorge' }),
  ];
  const adv = [[44, 200, 1.05]];
  const french = [
    S({ name: 'vanguard', type: 'knight', tabard: 'frenchStar', plume: COL.gold, center: [0, F], rows: 9, cols: 56, spacing: [1.0, 1.15], yaw: 0, seed: 5, banners: 5, bannerKind: 'fleur', schedule: adv, exclude: inZone(HERO_ZONES.french) }),
    S({ name: 'vanguard2', type: 'knight', tabard: 'frenchPale', center: [0, F - 12], rows: 8, cols: 50, spacing: [1.0, 1.15], yaw: 0, seed: 6, banners: 4, bannerKind: 'fleur', schedule: [[47, 200, 1.05]] }),
    S({ name: 'mainBattle', type: 'knight', tabard: 'frenchStar', center: [0, F - 30], rows: 10, cols: 50, spacing: [1.0, 1.15], yaw: 0, seed: 7, banners: 4, bannerKind: 'fleur' }),
    S({ name: 'horseL', type: 'cavalry', tabard: 'frenchStar', capTabard: 'frenchPale', plume: COL.gold, center: [-40, F + 2], rows: 4, cols: 12, spacing: [1.6, 2.6], yaw: 0.12, seed: 8, banners: 1, bannerKind: 'fleur', schedule: [[49, 200, 2.0]] }),
    S({ name: 'horseR', type: 'cavalry', tabard: 'frenchStar', capTabard: 'frenchPale', plume: 0xffffff, center: [40, F + 2], rows: 4, cols: 12, spacing: [1.6, 2.6], yaw: -0.12, seed: 9, banners: 1, bannerKind: 'fleur', schedule: [[49, 200, 2.0]] }),
  ];
  return { english, french, all: [...english, ...french] };
}

function stake(parent, x, z) {
  // half-driven stake, sharpened end toward the enemy
  const s = inked(new C.CylinderGeometry(0.07, 0.08, 1.0, 8), toon(0x9c6b3e), 0.02);
  s.position.set(x, 0.3, z); s.rotation.x = 0.55; parent.add(s);
  const tip = inked(new C.ConeGeometry(0.07, 0.25, 8), toon(0xd9b98a), 0.02);
  tip.position.y = 0.62; s.add(tip);
  return s;
}

export function buildHeroes(scene) {
  const groups = {};
  const heroes = [];
  const horses = [];
  const place = (g, h, x, z, ry = 0) => { h.root.position.set(x, 0, z); h.root.rotation.y = ry; g.add(h.root); heroes.push(h); return h; };

  // --- prologue: the bowyer by the fire
  groups.camp = new C.Group(); groups.camp.position.copy(LAYOUT.camp); scene.add(groups.camp);
  const bowyer = place(groups.camp, makeHero({ helm: 'hood', tabard: 'stgeorge', legColor: 0x6a5a48, weapon: 'stave', brows: 'calm' }), 1.55, 0, -Math.PI / 2);
  bowyer.mode = 'carve';

  // --- French knights in the rain
  groups.french = new C.Group(); scene.add(groups.french);
  const fz = F + 3.4;
  const k1 = place(groups.french, makeHero({ helm: 'great', armoured: true, tabard: 'frenchStar', plume: COL.gold, weapon: 'none' }), -1.0, fz + 0.3, 0.1);
  const k2 = place(groups.french, makeHero({ helm: 'great', armoured: true, tabard: 'frenchPale', weapon: 'none' }), 0.2, fz - 0.4, -0.05);
  const k3 = place(groups.french, makeHero({ helm: 'great', armoured: true, tabard: 'frenchStar', plume: 0xffffff, weapon: 'none' }), -2.3, fz - 0.6, 0.2);
  const k4 = place(groups.french, makeHero({ helm: 'great', armoured: true, tabard: 'frenchPale', plume: COL.gold }), 3.6, fz - 1.4, -0.1);
  [k1, k2, k3, k4].forEach((k) => (k.mode = 'idle'));
  for (const [x, z, cap, tab] of [[1.8, fz - 0.6, 'frenchPale', 'frenchStar'], [-3.9, fz - 1.9, 'frenchStar', 'frenchPale']]) {
    const horse = makeHorse({ cap, coat: x > 0 ? 0x8b5a3c : 0x7a4a30 });
    horse.root.position.set(x, 0, z); horse.root.rotation.y = x > 0 ? -0.15 : 0.2;
    groups.french.add(horse.root); horses.push(horse);
    const rider = makeHero({ helm: 'great', armoured: true, tabard: tab, weapon: 'lance', plume: x > 0 ? null : COL.gold });
    rider.mode = 'ride'; rider.root.position.y = -0.36; horse.saddle.add(rider.root); heroes.push(rider);
  }

  // --- English archers planting stakes (later: drawing their bows)
  groups.archers = new C.Group(); scene.add(groups.archers);
  const az = E - 0.4;
  const archerDefs = [
    [25.2, az, { helm: 'kettle', brows: 'angry' }],
    [27.2, az - 0.5, { helm: 'kettle', brows: 'angry', mouth: 'frown' }],
    [29.3, az + 0.1, { helm: 'none', hair: 0x4a2e1c, hairStyle: 'spiky', brows: 'angry' }],
    [23.2, az + 0.4, { helm: 'kettle', brows: 'worried' }],
    [31.3, az + 0.6, { helm: 'kettle', brows: 'angry' }],
  ];
  const archers = archerDefs.map(([x, z, o]) => {
    const h = place(groups.archers, makeHero({ tabard: 'stgeorge', weapon: 'mallet', ...o }), x, z, Math.PI + (x - 27) * -0.04);
    h.stake = stake(groups.archers, x + 0.05, z - 0.75);
    return h;
  });
  // bows for the volley shot (swap in when shooting)
  const bowArchers = archerDefs.map(([x, z, o]) => {
    const h = place(groups.archers, makeHero({ tabard: 'stgeorge', weapon: 'bow', ...o }), x, z + 0.6, Math.PI + 0.25);
    h.root.visible = false;
    return h;
  });

  // --- commanders by the windmill
  groups.commanders = new C.Group(); scene.add(groups.commanders);
  const cmd = LAYOUT.commanders;
  const knight = place(groups.commanders, makeHero({ helm: 'visor', armoured: true, tabard: 'royal' }), cmd.x - 0.9, cmd.z, Math.PI + 0.75);
  const king = place(groups.commanders, makeHero({ helm: 'crown', armoured: true, tabard: 'royal', hair: 0x8a5230, hairStyle: 'long', beard: 0x8a5230, brows: 'calm', mouth: 'flat' }), cmd.x + 0.9, cmd.z + 0.2, Math.PI - 0.3);
  knight.mode = 'point'; king.mode = 'nod';

  return { groups, heroes, horses, archers, bowArchers, bowyer, knight, king };
}
