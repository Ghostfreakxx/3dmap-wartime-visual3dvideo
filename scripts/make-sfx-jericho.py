#!/usr/bin/env python3
"""Sound design for OPERATION JERICHO (no music): gunfire, flares, jets, cannon, bombs, fire,
night insects, a helicopter, typewriter dates, freeze-frame hits, and the muffled heartbeat
and ringing ears of the death scene.   python3 scripts/make-sfx-jericho.py plan.json out.wav"""
import json, sys
import numpy as np
from scipy import signal
from scipy.ndimage import uniform_filter1d
from scipy.io import wavfile

SR = 44100
rng = np.random.default_rng(66)
plan = json.load(open(sys.argv[1]))
TOTAL = plan['total']; N = int(TOTAL * SR) + SR
L = np.zeros(N); Rr = np.zeros(N)
tt = np.arange(N) / SR

def sos(kind, f, o=2): return signal.butter(o, f, kind, fs=SR, output='sos')
def lp(x, f, o=2): return signal.sosfilt(sos('low', f, o), x)
def hp(x, f, o=2): return signal.sosfilt(sos('high', f, o), x)
def bp(x, a, b, o=2): return signal.sosfilt(sos('band', [a, b], o), x)
def env(n, a, d): t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)
def noise(sec): return rng.standard_normal(int(sec * SR))
def echo(x, delays=((0.18, 0.35), (0.42, 0.2), (0.75, 0.1))):  # hill echoes
    y = np.pad(x, (0, int(0.9 * SR)))
    for d, g in delays: k = int(d * SR); y[k:k + len(x)] += lp(x, 1800) * g
    return y

# ---------------------------------------------------------------- one-shots
def rifle():      # .303: sharp crack, chest thump, rolling echo off the ridges
    n = noise(0.4); crack = bp(n, 600, 8000) * env(len(n), 0.0003, 0.02)
    thump = np.sin(2 * np.pi * 85 * np.arange(len(n)) / SR) * env(len(n), 0.001, 0.06)
    return echo(crack * 1.0 + thump * 0.9 + lp(noise(0.4), 700) * env(len(n), 0.01, 0.14) * 0.4)
def bren():
    n = noise(0.3); return echo(bp(n, 350, 6500) * env(len(n), 0.0003, 0.03) * 0.95 + np.sin(2 * np.pi * 70 * np.arange(len(n)) / SR) * env(len(n), 0.001, 0.05) * 0.8, ((0.2, 0.25), (0.5, 0.12)))
def sten():
    n = noise(0.2); return echo(bp(n, 500, 5000) * env(len(n), 0.0003, 0.018) * 0.7 + np.sin(2 * np.pi * 110 * np.arange(len(n)) / SR) * env(len(n), 0.001, 0.03) * 0.5, ((0.2, 0.2),))
def cannon():     # 20/30 mm: heavy, fast "brrt"
    out = np.zeros(int(0.5 * SR))
    for k in range(5):
        i = int(k * 0.055 * SR); n = noise(0.12)
        out[i:i + len(n)] += bp(n, 120, 3000) * env(len(n), 0.0005, 0.03) + np.sin(2 * np.pi * 55 * np.arange(len(n)) / SR) * env(len(n), 0.001, 0.05) * 0.9
    return out
def boom(size=1.0):
    d = 4.0 * size; n = noise(d); t = np.arange(len(n)) / SR
    body = lp(n, 900) * env(len(n), 0.003, 0.5 * size)
    rumble = lp(noise(d), 110) * env(len(n), 0.02, 1.4 * size) * 2.4
    sub = np.sin(2 * np.pi * (45 - 18 * np.minimum(1, t)) * t) * env(len(n), 0.002, 0.8 * size)
    deb = np.zeros(len(n)); clicks = [hp(noise(0.015), 2000) * env(661, 0, 0.004) for _ in range(6)]
    for j in range(int(50 * size)):
        k = int(rng.uniform(0.2, 2.6 * size) * SR)
        if k < len(n) - 700: deb[k:k + 661] += clicks[j % 6] * rng.uniform(0.05, 0.3)
    return echo(body * 1.3 + rumble + sub + deb, ((0.35, 0.35), (0.9, 0.18)))
def flare():
    t = np.arange(int(2.6 * SR)) / SR; pop = bp(noise(2.6), 800, 4000) * env(len(t), 0.0005, 0.02) * 1.2
    hiss = hp(noise(2.6), 3000) * np.minimum(1, t / 0.3) * np.exp(-t / 2.0) * 0.12
    return pop + hiss
def hit(): n = noise(0.15); return lp(n, 450) * env(len(n), 0.001, 0.03) * 0.8
def impact():     # freeze-frame "hit": thump + snap
    n = noise(0.8); t = np.arange(len(n)) / SR
    return np.sin(2 * np.pi * (60 - 25 * t) * t) * env(len(n), 0.002, 0.25) * 1.2 + hp(n, 3000) * env(len(n), 0, 0.01) * 0.5
def whoosh(sec=0.7):
    n = noise(sec); t = np.arange(len(n)) / SR
    return bp(n, 400, 3500) * np.sin(np.pi * t / sec) ** 2 * 0.45
def tick(): n = noise(0.03); return bp(n, 2000, 6000) * env(len(n), 0, 0.004) * 0.6
def squelch():
    n = noise(0.22); t = np.arange(len(n)) / SR
    return bp(n, 1200, 4500) * (t < 0.12) * 0.35 + np.sin(2 * np.pi * 1250 * t) * ((t > 0.13) & (t < 0.2)) * 0.22
def jet(dur):     # a low pass: rising roar, peak overhead, falling away (doppler-ish sweep)
    sec = dur + 2.5; t = np.arange(int(sec * SR)) / SR; mid = sec / 2
    shape = np.exp(-((t - mid) / (dur * 0.33)) ** 2)
    roar = lp(noise(sec), 1800, 2) * 1.0 + bp(noise(sec), 2000, 6000) * 0.25
    whine = np.sin(2 * np.pi * np.cumsum(np.where(t < mid, 2600, 1700) / SR)) * 0.08
    out = (roar + whine) * shape
    return lp(out, 6000)

def place(x, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N or i < 0: return
    x = x[:N - i]; a = (pan + 1) * np.pi / 4
    L[i:i + len(x)] += x * gain * np.cos(a); Rr[i:i + len(x)] += x * gain * np.sin(a)
def slowmo(x, slow):
    f = max(0.35, min(1.0, slow))
    if f > 0.95: return x
    y = np.interp(np.arange(0, len(x) - 1, f), np.arange(len(x)), x)
    return lp(y, 900 + 2500 * f)

LIB = {'rifle': [rifle() for _ in range(5)], 'bren': [bren() for _ in range(5)], 'sten': [sten() for _ in range(4)], 'cannon': [cannon() for _ in range(3)],
       'bomb': [boom(1.3) for _ in range(2)], 'breach': [boom(0.6)], 'flare': [flare()], 'hit': [hit() for _ in range(3)]}
GAIN = {'rifle': 0.75, 'bren': 0.6, 'sten': 0.5, 'cannon': 1.0, 'bomb': 1.7, 'breach': 1.3, 'flare': 0.6, 'hit': 0.5}
REF = {'rifle': 12, 'bren': 12, 'sten': 9, 'cannon': 25, 'bomb': 40, 'breach': 20, 'flare': 30, 'hit': 5}
for k, e in enumerate(plan['events']):
    typ, d = e['type'], e['d']
    if typ == 'jet': place(jet(e['dur']), e['t'] - (e['dur'] + 2.5) / 2, 1.3 * 40 / (40 + d), e['pan']); continue
    src = LIB[typ][k % len(LIB[typ])]
    x = src if d < 45 else lp(src, 1400)
    if e['slow'] < 0.9: x = slowmo(x, e['slow'])
    place(x, e['t'] + (d / 343.0 if typ in ('rifle', 'bren', 'bomb', 'cannon', 'breach') else 0), GAIN[typ] * REF[typ] / (REF[typ] + d), e['pan'])

# ---------------------------------------------------------------- editorial sounds
for s in plan['shots']:
    if s['loc']:
        for c in range(s['loc']): place(tick(), s['start'] + 0.8 + c * 1.3 / s['loc'], 0.5)   # typewriter
    if s['freeze'] is not None: place(whoosh(0.5), s['freeze'] - 0.45, 0.6); place(impact(), s['freeze'], 0.9)
    if s['name'] == 'Cold Open': place(rifle(), s['start'] + 2.45, 1.4, -0.2)                   # the first shot in the dark
    if s['name'] in ('Siege', 'Jets', 'Aftermath'): place(whoosh(0.8), s['start'] - 0.35, 0.5)
    if s['title']: place(impact(), s['start'] + 2.2, 0.8)
    for sub in s['subs']:
        if 'Radio' in sub['who'] or 'commander' in sub['who'].lower() and 'Company' in sub['who']: place(squelch(), sub['t'] - 0.25, 0.7)

# ---------------------------------------------------------------- beds from the per-frame sheet
fr = plan['frames']; rate = plan['rate']
def curve(fn):
    v = np.array([fn(f) for f in fr], dtype=float)
    return np.interp(tt * rate, np.arange(len(v)), v)
night = curve(lambda f: 1.0 if (f['mood'] == 'night66' or f['shot'] == 'Cold Open') else 0.0)
insects = (np.sin(2 * np.pi * 4300 * tt) * (np.sin(2 * np.pi * 28 * tt) > 0.3) * (np.sin(2 * np.pi * 0.9 * tt + 1) > 0.2) * 0.013
           + np.sin(2 * np.pi * 3700 * tt) * (np.sin(2 * np.pi * 23 * tt + 2) > 0.4) * (np.sin(2 * np.pi * 0.6 * tt) > 0.4) * 0.01)
day = curve(lambda f: 1.0 if f['mood'] in ('siege', 'strike', 'ember') else 0.0)
wind = lp(rng.standard_normal(N), 380) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.11 * tt)) * 0.14
fireg = curve(lambda f: 0.0 if f['card'] else 12 / (12 + f['fire']))
crack = np.zeros(N); cl = [hp(rng.standard_normal(700), 1500) * env(700, 0, 0.003) for _ in range(8)]
for j, i in enumerate(rng.integers(0, N - 700, int(TOTAL * 45))): crack[i:i + 700] += cl[j % 8] * rng.uniform(0.05, 0.3)
crack = crack * 0.7 + lp(rng.standard_normal(N), 240) * 0.2
chopg = curve(lambda f: 0.0 if f['card'] else 20 / (20 + f['chop']))
phase = np.cumsum(np.full(N, 3 * 5.5 / SR)); chop = (lp(rng.standard_normal(N), 300) * np.exp(-((phase % 1) * 8)) * 3 + lp(rng.standard_normal(N), 90)) * chopg * 0.6
mapc = curve(lambda f: 1.0 if f['card'] == 'map' else 0.0)
radio = bp(rng.standard_normal(N), 900, 3500) * 0.03 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.7 * tt))
bed = insects * night + wind * day + crack * fireg + chop + radio * mapc
cards = uniform_filter1d(curve(lambda f: 0.0 if (f['card'] and f['shot'] != 'Cold Open' and f['card'] != 'map') else 1.0), int(0.3 * SR))
L += bed * cards; Rr += bed * cards

# ---------------------------------------------------------------- the death scene: muffled world, ringing ears, heartbeat
dying = uniform_filter1d(curve(lambda f: 1.0 if f['dying'] else 0.0), int(0.6 * SR))
for ch in (L, Rr):
    muff = lp(ch, 500, 2)
    ch[:] = ch * (1 - dying * 0.92) + muff * dying * 0.92
zs = next(s for s in plan['shots'] if s['dying'])
t0, death = zs['start'], zs['start'] + 14.6
ring_t = tt - t0
ring = np.sin(2 * np.pi * 3400 * tt) * 0.035 * np.exp(-np.clip(ring_t, 0, None) / 5) * (ring_t > 0) * (tt < t0 + zs['dur'])
L += ring; Rr += ring
def beat(): n = int(0.18 * SR); t = np.arange(n) / SR; return np.sin(2 * np.pi * 50 * t) * env(n, 0.004, 0.05) * 1.1
t, period = t0 + 0.4, 0.95
while t < death:
    place(beat(), t, 0.9); place(beat(), t + 0.24, 0.6)
    period *= 1.05; t += period
place(whoosh(1.4), death - 0.2, 0.25)

# ---------------------------------------------------------------- master
mix = np.stack([L, Rr], axis=1)
mix = np.tanh(mix * 1.3) / np.tanh(1.3)
mix /= max(1e-6, np.abs(mix).max()) / 0.89
wavfile.write(sys.argv[2], SR, (mix * 32767).astype(np.int16))
print('wrote', sys.argv[2], f'{len(mix) / SR:.1f}s')
