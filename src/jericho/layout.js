// Lammual — the 1st Battalion, Assam Rifles headquarters in Aizawl, 1966.
// No official plan survives in public sources, so this is a reconstruction for the film:
// a parade ground on the ridge top ringed by barracks, the battalion office, signals,
// armoury, a quarter guard at the gate, sandbagged bunkers and a perimeter fence,
// with the treasury, telephone exchange and a church just outside.
// Units: metres, local to the compound centre. x = east, z = north.
export const LAM = {
  fence: { hx: 22, hz: 20 },
  parade: { x: 0, z: -1, w: 32, d: 20 },
  helipad: { x: 9, z: -4, r: 3 },
  flagstaff: { x: 0, z: 11 },
  buildings: [
    { id: 'hq', name: 'Battalion HQ', x: 0, z: 15.5, w: 13, d: 5.5, h: 6.5, storeys: 2, col: 0xd9cdb0 },
    { id: 'signals', name: 'Signal office', x: 10.5, z: 15, w: 5, d: 4, h: 3.6, col: 0xc9bea0, mast: true },
    { id: 'mess', name: "Officers' mess", x: -10.5, z: 15, w: 7, d: 4.5, h: 3.6, col: 0xd2c6a8 },
    { id: 'barracksE1', name: 'Barracks', x: 18, z: -7, w: 5, d: 12, h: 3.6, col: 0xc3b48e },
    { id: 'barracksE2', name: 'Barracks', x: 18, z: 7, w: 5, d: 11, h: 3.6, col: 0xc3b48e },
    { id: 'barracksW', name: 'Barracks', x: -18, z: -7, w: 5, d: 10, h: 3.6, col: 0xc3b48e },
    { id: 'armoury', name: 'Armoury', x: -18, z: 7, w: 5, d: 5, h: 3.0, col: 0x9a9a92, sandbag: true },
    { id: 'qg', name: 'Quarter guard', x: -5, z: -15.5, w: 5, d: 3.5, h: 3.2, col: 0xd2c6a8 },
  ],
  gate: { x: 0, z: -20 },
  bunkers: [
    { id: 'B1', x: -21, z: -19 }, { id: 'B2', x: 21, z: -19 }, { id: 'B3', x: -21, z: 19 }, { id: 'B4', x: 21, z: 19 },
    { id: 'B5', x: -22.5, z: 0 }, { id: 'B6', x: 22.5, z: 0 }, { id: 'B7', x: 5, z: -20.6 },
  ],
  trench: [[-19.5, -14], [-18.5, -9], [-19.8, -5], [-18.5, -1], [-19.8, 3], [-18.6, 11], [-16, 18.6], [-6, 19.2], [6, 18.9], [16, 18.6]],
  outside: [
    { id: 'treasury', name: 'Treasury', x: -13, z: -30, w: 8, d: 5, h: 4.2, col: 0xb8b0a0 },
    { id: 'exchange', name: 'Telephone exchange', x: 12, z: -31, w: 7, d: 5, h: 4, col: 0xc8c0aa, mast: true },
    { id: 'church', name: 'Church', x: 33, z: 4, w: 7, d: 12, h: 5.5, col: 0xece6d8, steeple: true },
  ],
  road: [[0, -20], [1, -25], [-1, -31], [3, -38], [8, -46], [10, -60]],
  // the film's battle plan
  mnaAxes: [
    { from: [-52, 36], to: [-23, 19], label: 'N-W' }, { from: [-58, -2], to: [-24, 0], label: 'W' },
    { from: [-22, -57], to: [-13, -32], label: 'S' }, { from: [24, -57], to: [12, -33], label: 'S-E' },
    { from: [55, -16], to: [23, -15], label: 'E' }, { from: [12, 54], to: [2, 21], label: 'N' },
  ],
  flagSite: 'B1',
  airRuns: [[[-70, -50], [70, 45]], [[-70, 30], [70, -35]]],
  retreat: [{ from: [-23, 0], to: [-60, 10] }, { from: [-21, 19], to: [-50, 47] }, { from: [12, -33], to: [30, -62] }],
};
