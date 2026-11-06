// Seeded 2D Perlin noise + fractal helpers. Deterministic, so every render
// of the same scene produces the same terrain and textures.

export function makeNoise(seed = 1) {
  let s = (seed >>> 0) || 1;
  const rand = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;

  const perm = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  const p = new Uint8Array(512);
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];

  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + (b - a) * t;
  const grad = (h, x, y) => {
    switch (h & 7) {
      case 0: return x + y;
      case 1: return -x + y;
      case 2: return x - y;
      case 3: return -x - y;
      case 4: return x;
      case 5: return -x;
      case 6: return y;
      default: return -y;
    }
  };

  function noise2(x, y) {
    const fx = Math.floor(x), fy = Math.floor(y);
    const X = fx & 255, Y = fy & 255;
    x -= fx; y -= fy;
    const u = fade(x), v = fade(y);
    const a = p[X] + Y, b = p[X + 1] + Y;
    return lerp(
      lerp(grad(p[a], x, y), grad(p[b], x - 1, y), u),
      lerp(grad(p[a + 1], x, y - 1), grad(p[b + 1], x - 1, y - 1), u),
      v,
    );
  }

  /** Fractal Brownian motion, roughly in [-1, 1]. */
  function fbm(x, y, octaves = 5) {
    let sum = 0, amp = 0.5, f = 1, norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += noise2(x * f, y * f) * amp;
      norm += amp; amp *= 0.5; f *= 2.03;
    }
    return sum / norm;
  }

  /** Ridged multifractal in [0, 1]: sharp crests, good for mountain ranges. */
  function ridged(x, y, octaves = 6) {
    let sum = 0, amp = 0.5, f = 1, norm = 0, weight = 1;
    for (let i = 0; i < octaves; i++) {
      let n = 1 - Math.abs(noise2(x * f, y * f));
      n *= n * weight;
      weight = Math.min(1, n * 1.6);
      sum += n * amp;
      norm += amp; amp *= 0.5; f *= 2.1;
    }
    return sum / norm;
  }

  return { noise2, fbm, ridged, rand };
}
