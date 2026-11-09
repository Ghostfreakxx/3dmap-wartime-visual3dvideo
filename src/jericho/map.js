// Draws the Lammual plan as an old field map. Used as a still and, animated, inside the film.
import { LAM } from './layout.js';

export function drawLammualMap(g, W, H, opt = {}) {
  const t = opt.progress ?? 1;           // 0..1: how much of the battle plan is drawn
  const show = opt.layers ?? { axes: true, air: true, retreat: true, legend: true };
  const S = Math.min(W / 128, H / 100), cx = W * 0.45, cy = H * 0.53;
  const P = (x, z) => [cx + x * S, cy - z * S];
  // parchment
  const bg = g.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W * 0.7);
  bg.addColorStop(0, '#efe3c4'); bg.addColorStop(1, '#cdb98e'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // contours of the ridge
  g.strokeStyle = 'rgba(120,90,50,0.35)'; g.lineWidth = 1.2;
  for (let r = 30; r < 110; r += 9) { g.beginPath(); for (let a = 0; a <= 64; a++) { const th = (a / 64) * Math.PI * 2, rr = r * (1 + 0.12 * Math.sin(th * 3 + r) + 0.05 * Math.cos(th * 5)); const [x, y] = P(Math.cos(th) * rr * 1.15, Math.sin(th) * rr * 0.85); a ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  // town houses (Aizawl on the slopes)
  g.fillStyle = 'rgba(110,80,50,0.45)';
  for (let i = 0; i < 260; i++) { const a = (i * 2.399) % (Math.PI * 2), r = 30 + ((i * 37) % 55); const [x, y] = P(Math.cos(a) * r * 1.15, Math.sin(a) * r * 0.9); g.fillRect(x - 3, y - 2, 6, 4); }
  // road
  g.strokeStyle = '#8a6a40'; g.lineWidth = 5; g.beginPath(); LAM.road.forEach(([x, z], i) => { const [a, b] = P(x, z); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.stroke();
  // fence
  const { hx, hz } = LAM.fence; const [fx0, fy0] = P(-hx, hz), [fx1, fy1] = P(hx, -hz);
  g.strokeStyle = '#3a2a1a'; g.lineWidth = 2; g.setLineDash([6, 4]); g.strokeRect(fx0, fy0, fx1 - fx0, fy1 - fy0); g.setLineDash([]);
  // parade ground
  const pd = LAM.parade; const [p0, q0] = P(pd.x - pd.w / 2, pd.z + pd.d / 2);
  g.fillStyle = 'rgba(214,190,140,0.9)'; g.fillRect(p0, q0, pd.w * S, pd.d * S); g.strokeStyle = '#6a5030'; g.strokeRect(p0, q0, pd.w * S, pd.d * S);
  g.fillStyle = '#5a4020'; g.font = `bold ${Math.round(S * 3.2)}px Georgia, serif`; g.textAlign = 'center'; g.fillText('LAMMUAL', ...P(pd.x - 4, pd.z + 1)); g.font = `italic ${Math.round(S * 2)}px Georgia, serif`; g.fillText('parade ground', ...P(pd.x - 4, pd.z - 2.4));
  const [hpx, hpy] = P(LAM.helipad.x, LAM.helipad.z); g.beginPath(); g.arc(hpx, hpy, LAM.helipad.r * S, 0, 7); g.stroke(); g.font = `bold ${Math.round(S * 3)}px Georgia`; g.fillText('H', hpx, hpy + S);
  // flagstaff
  const [fsx, fsy] = P(LAM.flagstaff.x, LAM.flagstaff.z); g.fillStyle = '#ff9933'; g.fillRect(fsx, fsy - 10, 12, 4); g.fillStyle = '#fff'; g.fillRect(fsx, fsy - 6, 12, 4); g.fillStyle = '#138808'; g.fillRect(fsx, fsy - 2, 12, 4); g.fillStyle = '#222'; g.fillRect(fsx - 1, fsy - 10, 2, 14);
  // buildings
  const bld = (b, inside) => { const [x0, y0] = P(b.x - b.w / 2, b.z + b.d / 2); g.fillStyle = inside ? '#7a6248' : '#8a7a6a'; g.fillRect(x0, y0, b.w * S, b.d * S); g.strokeStyle = '#2a1a0a'; g.lineWidth = 1.5; g.strokeRect(x0, y0, b.w * S, b.d * S);
    g.fillStyle = '#2a1a0a'; g.font = `${Math.round(S * 1.7)}px Georgia, serif`;
    let lx, ly;
    if (Math.abs(b.x) > 15 && inside) { g.textAlign = b.x > 0 ? 'left' : 'right'; [lx, ly] = P(b.x + Math.sign(b.x) * (b.w / 2 + 1.0), b.z); }
    else if (b.z > 10 && inside) { g.textAlign = 'center'; [lx, ly] = P(b.x, b.z + b.d / 2 + 1.2); }
    else { g.textAlign = 'center'; [lx, ly] = P(b.x, b.z - b.d / 2 - 2.6); }
    g.fillText(b.name, lx, ly); };
  LAM.buildings.forEach((b) => bld(b, true)); LAM.outside.forEach((b) => bld(b, false));
  // bunkers & trench
  LAM.bunkers.forEach((b) => { const [x, y] = P(b.x, b.z); g.fillStyle = '#4a5a2a'; g.beginPath(); g.arc(x, y, 1.7 * S, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = `bold ${Math.round(S * 1.6)}px Georgia`; g.fillText(b.id, x, y + S * 0.6); });
  g.strokeStyle = '#4a5a2a'; g.lineWidth = 3; g.beginPath(); LAM.trench.forEach(([x, z], i) => { const [a, b] = P(x, z); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.stroke();
  // arrows
  const arrow = (from, to, col, k, dash) => { if (k <= 0) return; const [x0, y0] = P(...from), [x1, y1] = P(...to); const x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k;
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 5; if (dash) g.setLineDash([12, 8]); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x, y); g.stroke(); g.setLineDash([]);
    const a = Math.atan2(y1 - y0, x1 - x0); g.beginPath(); g.moveTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12); g.lineTo(x + Math.cos(a + 2.5) * 14, y + Math.sin(a + 2.5) * 14); g.lineTo(x + Math.cos(a - 2.5) * 14, y + Math.sin(a - 2.5) * 14); g.fill(); };
  const ease = (x) => Math.max(0, Math.min(1, x));
  if (show.axes) LAM.mnaAxes.forEach((ax, i) => arrow(ax.from, ax.to, '#b0181c', ease(t * 2.2 - i * 0.12), false));
  if (show.air) LAM.airRuns.forEach(([a, b], i) => arrow(a, b, '#1d3d8a', ease(t * 2 - 1 - i * 0.15), true));
  if (show.retreat) LAM.retreat.forEach((r, i) => arrow(r.from, r.to, '#b0181c', ease(t * 2 - 1.3 - i * 0.1), true));
  // MNF flag site
  const fb = LAM.bunkers.find((b) => b.id === LAM.flagSite); const [fx, fy] = P(fb.x, fb.z);
  if (t > 0.45) { g.strokeStyle = '#b0181c'; g.lineWidth = 3; g.beginPath(); g.arc(fx, fy, 3.2 * S, 0, 7); g.stroke(); g.fillStyle = '#b0181c'; g.font = `bold ${Math.round(S * 1.8)}px Georgia`; g.textAlign = 'left'; g.fillText('MNF flag raised, 4 Mar', fx + 4 * S, fy + 5 * S); }
  // title & legend
  g.textAlign = 'left'; g.fillStyle = '#2a1a0a';
  g.font = `bold ${Math.round(H * 0.04)}px Georgia, serif`; g.fillText('LAMMUAL — 1st Bn ASSAM RIFLES HQ, AIZAWL', W * 0.03, H * 0.07);
  g.font = `italic ${Math.round(H * 0.022)}px Georgia, serif`; g.fillText('28 Feb – 7 Mar 1966 · reconstruction for the film, not an official plan', W * 0.03, H * 0.105);
  if (show.legend) {
    const lx = W * 0.79, ly = H * 0.2, fs = Math.round(H * 0.02); g.font = `${fs}px Georgia, serif`;
    const row = (i, draw, txt) => { draw(lx, ly + i * fs * 1.9); g.fillStyle = '#2a1a0a'; g.fillText(txt, lx + 34, ly + i * fs * 1.9 + fs * 0.35); };
    row(0, (x, y) => { g.strokeStyle = '#b0181c'; g.lineWidth = 5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 26, y); g.stroke(); }, 'MNA attack, night 28 Feb');
    row(1, (x, y) => { g.strokeStyle = '#1d3d8a'; g.lineWidth = 5; g.setLineDash([8, 5]); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 26, y); g.stroke(); g.setLineDash([]); }, 'IAF strike runs, 5–6 Mar');
    row(2, (x, y) => { g.strokeStyle = '#b0181c'; g.lineWidth = 5; g.setLineDash([8, 5]); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 26, y); g.stroke(); g.setLineDash([]); }, 'MNA withdrawal');
    row(3, (x, y) => { g.fillStyle = '#4a5a2a'; g.beginPath(); g.arc(x + 12, y, 7, 0, 7); g.fill(); }, 'Sandbagged MG bunker');
    row(4, (x, y) => { g.fillStyle = '#7a6248'; g.fillRect(x + 2, y - 6, 22, 12); }, 'Assam Rifles building');
    row(5, (x, y) => { g.fillStyle = 'rgba(110,80,50,0.6)'; g.fillRect(x + 6, y - 3, 12, 6); }, 'Town houses (Aizawl)');
    // compass
    const [nx, ny] = [W * 0.9, H * 0.82]; g.strokeStyle = '#2a1a0a'; g.lineWidth = 2; g.beginPath(); g.moveTo(nx, ny + 30); g.lineTo(nx, ny - 30); g.stroke();
    g.beginPath(); g.moveTo(nx, ny - 34); g.lineTo(nx - 8, ny - 18); g.lineTo(nx + 8, ny - 18); g.fill(); g.font = `bold ${fs + 4}px Georgia`; g.textAlign = 'center'; g.fillText('N', nx, ny - 40);
  }
}
