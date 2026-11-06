// Combat effects for campaign maps: exchanges of fire between units and air
// strikes. Everything is derived from the timeline time t, so renders are
// deterministic and frame-accurate.
//
// keyframe.fights:     [{ a: "unitId" | [lon,lat], b: "unitId" | [lon,lat],
//                         intensity: 1..3, oneWay: false }]
// keyframe.airstrikes: [{ from: [lon,lat], at: [lon,lat], label, passes: 2 }]
//
// Both are active while the map moves toward that keyframe (as the
// fighting that produces it) and fade out early in the next interval.

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const frac = (x) => x - Math.floor(x);
const hash = (n) => frac(Math.sin(n * 127.1 + 311.7) * 43758.5453);

/** Activity level for effects of keyframe k given the current interval. */
function windows(kfs, i, f, key, { tail = true, stopKey = null } = {}) {
  const out = [];
  const next = kfs[i + 1];
  const stop = (stopKey && next?.[stopKey]) ?? 1;
  if (next?.[key]) out.push([next, clamp01((f - 0.08) / 0.12) * clamp01((stop - f) / 0.1 + (stop >= 1 ? 1 : 0))]);
  if (tail && i > 0 && kfs[i]?.[key]) out.push([kfs[i], 1 - clamp01(f / 0.25)]);
  return out.filter(([, a]) => a > 0.01);
}

function resolve(ref, unitPos, S) {
  if (Array.isArray(ref)) return S(ref);
  return unitPos.get(ref) ?? null;
}

export function drawFights(ctx, kfs, i, f, t, units, factions, S, u) {
  const unitPos = new Map();
  const unitFaction = new Map();
  for (const un of units) {
    const [x, y] = S(un.at);
    unitPos.set(un.id, [x, y - 22 * u]); // fire from the flag, not the ground pin
    unitFaction.set(un.id, un.faction);
  }
  windows(kfs, i, f, 'fights').forEach(([kf, alpha], wi) => {
    kf.fights.forEach((fight, fi) => {
      const A = resolve(fight.a, unitPos, S);
      const B = resolve(fight.b, unitPos, S);
      if (!A || !B) return;
      const colA = factions[unitFaction.get(fight.a) ?? fight.factionA]?.color ?? '#ffd25a';
      const colB = factions[unitFaction.get(fight.b) ?? fight.factionB]?.color ?? '#ffd25a';
      const seed = (wi + 1) * 1000 + fi * 37;
      const n = 5 * (fight.intensity ?? 2);
      volley(ctx, A, B, colA, n, t, seed, alpha, u);
      if (!fight.oneWay) volley(ctx, B, A, colB, n, t + 0.37, seed + 500, alpha, u);
    });
  });
}

function volley(ctx, P, Q, color, n, t, seed, alpha, u) {
  const dx = Q[0] - P[0], dy = Q[1] - P[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len, px = -uy, py = ux;
  ctx.save();
  ctx.lineCap = 'round';
  for (let k = 0; k < n; k++) {
    const rate = 0.9 + hash(seed + k) * 0.9; // shots per second per tracer
    const ph = frac(t * rate + hash(seed + k * 7.3));
    // bursts: tracers are idle part of the time so fire comes in pulses
    if (hash(seed + k * 3.1 + Math.floor(t * rate + hash(seed + k * 7.3))) < 0.35) continue;
    const spread = (hash(seed + k * 5.7) - 0.5) * 26 * u;
    const miss = (hash(seed + k * 9.1 + Math.floor(t * rate)) - 0.5) * 30 * u;
    const sx = P[0] + px * spread * 0.3, sy = P[1] + py * spread * 0.3;
    const ex = Q[0] + px * miss, ey = Q[1] + py * miss;
    const hx = sx + (ex - sx) * ph, hy = sy + (ey - sy) * ph;
    const tail = Math.min(44 * u, len * 0.35);
    ctx.globalAlpha = alpha;
    // tracer: glow in the shooter's colour with a hot core
    ctx.strokeStyle = color;
    ctx.lineWidth = 9 * u;
    ctx.globalAlpha = alpha * 0.5;
    ctx.beginPath(); ctx.moveTo(hx - ux * tail, hy - uy * tail); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#fff6c8';
    ctx.lineWidth = 3.4 * u;
    ctx.beginPath(); ctx.moveTo(hx - ux * tail, hy - uy * tail); ctx.lineTo(hx, hy); ctx.stroke();
    // muzzle flash
    if (ph < 0.1) {
      const r = (1 - ph / 0.1) * 16 * u;
      ctx.fillStyle = '#ffe9a0';
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
    }
    // impact: small dust puff + sparks
    if (ph > 0.88) {
      const q = (ph - 0.88) / 0.12;
      ctx.globalAlpha = alpha * (1 - q);
      ctx.fillStyle = 'rgba(70,60,50,0.8)';
      ctx.beginPath(); ctx.arc(ex, ey, (7 + q * 18) * u, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffcf6a';
      ctx.lineWidth = 2 * u;
      for (let s = 0; s < 4; s++) {
        const a = hash(seed + k + s * 13) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex + Math.cos(a) * q * 22 * u, ey + Math.sin(a) * q * 22 * u);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

export function drawAirstrikes(ctx, kfs, i, f, t, S, u, outlinedText, style) {
  // air strikes play on the way into their keyframe and while it is held;
  // keyframe.airstrikeStop (0..1) ends them early, for strikes dated
  // between two keyframes
  windows(kfs, i, f, 'airstrikes', { tail: false, stopKey: 'airstrikeStop' }).forEach(([kf, alpha]) => {
    kf.airstrikes.forEach((st, si) => {
      const [fx, fy] = S(st.from);
      const [tx, ty] = S(st.at);
      const dx = tx - fx, dy = ty - fy;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      const period = st.period ?? 2.6;
      const passes = st.passes ?? 2;
      ctx.save();
      for (let p = 0; p < passes; p++) {
        const ph = frac(t / period + p / passes + si * 0.21);
        // jet flies from origin, over the target, and on past it
        const d = ph * len * 1.5;
        const jx = fx + ux * d + -uy * (p - (passes - 1) / 2) * 30 * u;
        const jy = fy + uy * d + ux * (p - (passes - 1) / 2) * 30 * u;
        const fade = alpha * clamp01(ph / 0.08) * clamp01((1 - ph) / 0.1);
        ctx.globalAlpha = fade * 0.5;
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2 * u;
        ctx.beginPath(); ctx.moveTo(jx - ux * 60 * u, jy - uy * 60 * u); ctx.lineTo(jx, jy); ctx.stroke();
        ctx.globalAlpha = fade;
        jetIcon(ctx, jx, jy, Math.atan2(uy, ux), 24 * u);

        // bombs burst around the target just after the jet passes overhead
        const over = d / len;
        if (over > 0.95 && over < 1.45) {
          const q = (over - 0.95) / 0.5;
          for (let b = 0; b < 3; b++) {
            const off = (hash(si * 50 + p * 7 + b) - 0.5) * 50 * u;
            const off2 = (hash(si * 90 + p * 3 + b) - 0.5) * 40 * u;
            const lq = clamp01(q * 1.6 - b * 0.25);
            if (lq <= 0) continue;
            explosion(ctx, tx + off, ty + off2, lq, u, fade);
          }
        }
      }
      if (st.label) {
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        outlinedText(ctx, st.label, tx, ty - 46 * u, 24 * u, style, '#ffd25a');
      }
      ctx.restore();
    });
  });
}

function explosion(ctx, x, y, q, u, alpha) {
  ctx.globalAlpha = alpha * (1 - q) * 0.9;
  ctx.fillStyle = 'rgba(60,50,45,0.85)';
  ctx.beginPath(); ctx.arc(x, y - q * 10 * u, (10 + q * 26) * u, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = alpha * (1 - q);
  const g = ctx.createRadialGradient(x, y, 0, x, y, (8 + q * 22) * u);
  g.addColorStop(0, '#fff3b0');
  g.addColorStop(0.5, '#ff9a2e');
  g.addColorStop(1, 'rgba(200,40,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, (8 + q * 22) * u, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,230,180,0.8)';
  ctx.lineWidth = 2 * u;
  ctx.beginPath(); ctx.arc(x, y, (6 + q * 40) * u, 0, Math.PI * 2); ctx.stroke();
}

function jetIcon(ctx, x, y, ang, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = '#e9edf0';
  ctx.strokeStyle = '#111';
  ctx.lineWidth = s * 0.12;
  ctx.beginPath();
  ctx.moveTo(s, 0);
  ctx.lineTo(-0.2 * s, -0.9 * s);
  ctx.lineTo(-0.35 * s, -0.9 * s);
  ctx.lineTo(-0.1 * s, -0.15 * s);
  ctx.lineTo(-0.7 * s, -0.12 * s);
  ctx.lineTo(-0.9 * s, -0.45 * s);
  ctx.lineTo(-1.0 * s, -0.45 * s);
  ctx.lineTo(-0.9 * s, 0);
  ctx.lineTo(-1.0 * s, 0.45 * s);
  ctx.lineTo(-0.9 * s, 0.45 * s);
  ctx.lineTo(-0.7 * s, 0.12 * s);
  ctx.lineTo(-0.1 * s, 0.15 * s);
  ctx.lineTo(-0.35 * s, 0.9 * s);
  ctx.lineTo(-0.2 * s, 0.9 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
