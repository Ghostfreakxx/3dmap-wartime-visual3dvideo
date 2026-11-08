#!/usr/bin/env python3
"""Procedural sound-effects track (no music) for a film, from its cue sheet.

python3 scripts/make-sfx.py audioplan.json out.wav

Everything is synthesised: helicopter rotors & turbine, suppressed rifles, AKs, the door-gun
minigun, explosions, the breach, fast-rope zips, radio squelch before radio lines, fire crackle,
night insects, room tone, dawn wind, and low "braam" hits for the big moments. Sounds are
placed by distance and pan relative to the camera; slow-motion cues are pitched down and smeared.
"""
import json, sys
import numpy as np
from scipy import signal
from scipy.ndimage import uniform_filter1d

SR = 44100
rng = np.random.default_rng(7)
plan = json.load(open(sys.argv[1]))
N = int(plan['total'] * SR) + SR
L = np.zeros(N); Rr = np.zeros(N)

def lp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, a, b, o=2): return signal.sosfilt(signal.butter(o, [a, b], 'band', fs=SR, output='sos'), x)
def env(n, attack, decay):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(attack, 1e-4)) * np.exp(-t / decay)
def noise(sec): return rng.standard_normal(int(sec * SR))

# ---------------------------------------------------------------- one-shot library
def ak():
    n = noise(0.35); e = env(len(n), 0.0005, 0.035)
    crack = bp(n, 400, 7000) * e
    thump = np.sin(2 * np.pi * 95 * np.arange(len(n)) / SR) * env(len(n), 0.001, 0.05)
    tail = lp(noise(0.35), 900) * env(len(n), 0.01, 0.12) * 0.35
    return crack * 0.9 + thump * 0.8 + tail
def supp():
    n = noise(0.12); e = env(len(n), 0.0003, 0.012)
    return hp(n, 1800) * e * 0.55 + bp(noise(0.12), 2500, 6000) * env(len(n), 0.0, 0.004) * 0.6
def mini():
    n = noise(0.09); e = env(len(n), 0.0003, 0.018)
    return bp(n, 200, 5000) * e * 0.7 + np.sin(2 * np.pi * 70 * np.arange(len(n)) / SR) * env(len(n), 0.001, 0.03) * 0.6
def boom(size=1.0):
    d = 3.2 * size; n = noise(d); t = np.arange(len(n)) / SR
    body = lp(n, 900) * env(len(n), 0.003, 0.45 * size)
    rumble = lp(noise(d), 120) * env(len(n), 0.02, 1.1 * size) * 2.2
    sub = np.sin(2 * np.pi * (48 - 18 * np.minimum(1, t)) * t) * env(len(n), 0.002, 0.7 * size) * 0.9
    debris = np.zeros(len(n))
    for _ in range(int(40 * size)):
        k = int(rng.uniform(0.15, 2.2 * size) * SR)
        if k < len(n) - 600: debris[k:k + 600] += hp(noise(600 / SR), 2000) * env(600, 0, 0.004) * rng.uniform(0.05, 0.25)
    return body * 1.2 + rumble + sub + debris
def rope():
    n = noise(1.35); t = np.arange(len(n)) / SR
    zip_ = bp(n, 1500, 6000) * (0.25 + 0.2 * np.sin(2 * np.pi * 11 * t) ** 2) * np.minimum(1, t / 0.05) * np.clip((1.35 - t) / 0.1, 0, 1)
    thud = lp(noise(0.2), 300) * env(int(0.2 * SR), 0.002, 0.04)
    out = zip_ * 0.5; out[-len(thud):] += thud * 1.2
    return out
def hit():
    n = noise(0.15); return lp(n, 500) * env(len(n), 0.001, 0.03) * 0.8
def squelch():
    n = noise(0.22); t = np.arange(len(n)) / SR
    hiss = bp(n, 1200, 4500) * (t < 0.12) * 0.35
    beep = np.sin(2 * np.pi * 1250 * t) * ((t > 0.13) & (t < 0.2)) * 0.25
    return hiss + beep
def braam(sec=4.0, root=55.0):
    t = np.arange(int(sec * SR)) / SR
    x = sum(signal.sawtooth(2 * np.pi * f * (1 + det) * t) for f in (root, root * 1.5, root * 2) for det in (-0.004, 0.003))
    x = lp(x, 500, 4) * env(len(t), 0.06, sec * 0.35)
    return x * 0.35 + np.sin(2 * np.pi * root / 2 * t) * env(len(t), 0.03, sec * 0.4) * 0.6
def whoosh(sec=0.9):
    n = noise(sec); t = np.arange(len(n)) / SR
    return bp(n, 300, 3000) * np.sin(np.pi * t / sec) ** 2 * 0.4

LIB = {'ak': [ak() for _ in range(5)], 'supp': [supp() for _ in range(5)], 'mini': [mini() for _ in range(5)],
       'boom': [boom(1.2)], 'breach': [boom(0.7)], 'rope': [rope()], 'hit': [hit() for _ in range(3)]}
GAIN = {'ak': 0.9, 'supp': 0.55, 'mini': 0.75, 'boom': 1.6, 'breach': 1.5, 'rope': 0.7, 'hit': 0.5}
REF = {'ak': 8, 'supp': 5, 'mini': 18, 'boom': 30, 'breach': 20, 'rope': 6, 'hit': 4}

def place(x, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N: return
    x = x[:N - i]
    a = (pan + 1) * np.pi / 4
    L[i:i + len(x)] += x * gain * np.cos(a); Rr[i:i + len(x)] += x * gain * np.sin(a)

def slowmo(x, slow):
    f = max(0.35, min(1.0, slow))
    if f > 0.95: return x
    idx = np.arange(0, len(x) - 1, f)
    y = np.interp(idx, np.arange(len(x)), x)
    y = lp(y, 900 + 2500 * f)
    ir = noise(1.2) * env(int(1.2 * SR), 0.0, 0.35) * 0.05     # smear / reverb
    return signal.fftconvolve(y, ir)[: len(y) + int(0.8 * SR)] + np.pad(y, (0, int(0.8 * SR)))[: len(y) + int(0.8 * SR)]

# ---------------------------------------------------------------- discrete cues
for k, e in enumerate(plan['events']):
    typ = e['type']; src = LIB[typ][k % len(LIB[typ])]
    d = e['d']; g = GAIN[typ] * REF[typ] / (REF[typ] + d)
    x = src if d < 40 else lp(src, 1500)
    if e['slow'] < 0.9: x = slowmo(x, e['slow'])
    place(x, e['t'] + d / 343.0 * (0 if typ in ('supp', 'hit') else 1), g, e['pan'])

# radio squelch before radio lines (call signs), a phone line for New Delhi
RADIO = ('Vanapa', 'Dawn', 'Overwatch', 'Team leader', 'Ranger', 'Pilot')
for sub in plan['subs']:
    if sub['who'].startswith(RADIO): place(squelch(), max(0, sub['t'] - 0.25), 0.8, 0.0)

def ring():
    t = np.arange(int(1.6 * SR)) / SR
    tone = (np.sin(2 * np.pi * 440 * t) + np.sin(2 * np.pi * 480 * t)) * 0.18
    gate = ((t % 0.4) < 0.2) & (t < 1.0)
    return tone * gate * np.minimum(1, (1.6 - t) / 0.2)
def click():
    n = noise(0.06); return hp(n, 1500) * env(len(n), 0, 0.006) * 0.6
def tick():
    n = noise(0.03); return bp(n, 2500, 7000) * env(len(n), 0, 0.003) * 0.25

# big moments: title, breach slow motion, the rescue, lift-off
for sh in plan['shots']:
    if sh['title']: place(braam(5.0, 49.0), sh['start'] + 3.3, 0.9)
    if sh['name'] == 'Breach': place(whoosh(1.0), sh['start'] + 1.0, 0.8); place(braam(4.0, 41.2), sh['start'] + 1.4, 0.8)
    if sh['name'] == 'The Room': place(braam(6.0, 65.4), sh['start'] + 1.0, 0.15)
    if sh['name'] == 'Fast Rope': place(whoosh(1.2), sh['start'], 0.6)
    if sh['name'] == 'Dawn': place(braam(7.0, 55.0), sh['start'] + 0.3, 0.5)
    if sh['name'] == 'End': place(braam(5.0, 41.2), sh['start'] + 0.2, 0.5)
    if sh['name'] == 'Secure Line': place(ring(), sh['start'] + 0.1, 0.7); place(ring(), sh['start'] + 0.75, 0.7); place(click(), sh['start'] + 1.5, 0.9)
    if sh['name'] == 'Decision': place(braam(4.5, 49.0), sh['start'] + 0.2, 0.55)
    if sh['name'] == 'Aizawl': place(braam(5.0, 36.7), sh['start'] + 0.3, 0.4)

# a wall clock ticking through the cabinet scenes
ROOMSHOTS = ('Cabinet', 'Home Minister', 'Chief Minister', 'The Colonel', 'Secure Line', 'Decision')
for sh in plan['shots']:
    if sh['name'] in ROOMSHOTS:
        for k in range(int(sh['dur'])): place(tick(), sh['start'] + k + 0.3, 0.5)

# ---------------------------------------------------------------- continuous beds (per video frame -> per sample)
fr = plan['frames']; rate = plan['rate']
tt = np.arange(N) / SR
fi = np.minimum(len(fr) - 1, (tt * rate).astype(int))
def curve(fn):
    v = np.array([fn(f) for f in fr], dtype=float)
    return np.interp(tt * rate, np.arange(len(v)), v)

# beds and rotors fade out on the black cards; one-shot hits (braams) carry over them
cardg = uniform_filter1d(curve(lambda f: 0.0 if f['card'] else 1.0), int(0.25 * SR))

# helicopters: blade-slap pulses + turbine whine + rumble, per helicopter
def heli_bed(key, seed):
    r = np.random.default_rng(seed)
    g = curve(lambda f: 0 if f['card'] else (14 / (14 + f[key]['d'])) * (0.18 if f['interior'] else 1.0))
    pan = curve(lambda f: 0 if f['card'] else f[key]['pan'])
    slow = curve(lambda f: f['slow'])
    phase = np.cumsum(17.5 * np.clip(slow, 0.35, 1.2) / SR)     # 4 blades x ~4.4 rev/s
    pulse = np.exp(-((phase % 1.0) * 9.0)) ** 2
    slap = lp(r.standard_normal(N), 260) * pulse * 3.0
    rumble = lp(r.standard_normal(N), 90) * 1.4
    whine = (np.sin(2 * np.pi * np.cumsum(1900 * np.clip(slow, 0.5, 1.1) / SR)) * 0.06 + np.sin(2 * np.pi * np.cumsum(3800 / SR)) * 0.02)
    x = (slap + rumble + whine) * g * cardg
    a = (pan + 1) * np.pi / 4
    return x * np.cos(a), x * np.sin(a)
for key, seed in (('h1', 1), ('h2', 2)):
    hl, hr = heli_bed(key, seed); L += hl * 0.55; Rr += hr * 0.55

# night insects outside, room tone inside, dawn wind, burning tower crackle
night = curve(lambda f: 1.0 if (f['mood'] == 'nightOps' and not f['interior'] and not f['card']) else 0.0)
insects = np.sin(2 * np.pi * 4300 * tt) * (np.sin(2 * np.pi * 28 * tt) > 0.3) * (np.sin(2 * np.pi * 0.9 * tt + 1) > 0.2) * 0.012
insects += np.sin(2 * np.pi * 3700 * tt) * (np.sin(2 * np.pi * 23 * tt + 2) > 0.4) * (np.sin(2 * np.pi * 0.6 * tt) > 0.4) * 0.009
inter = curve(lambda f: 1.0 if f['interior'] else 0.0)
room = lp(rng.standard_normal(N), 180) * 0.05
dawn = curve(lambda f: 1.0 if (f['mood'] == 'dawn' and not f['card']) else 0.0)
wind = lp(rng.standard_normal(N), 400) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.13 * tt)) * 0.12
fireg = curve(lambda f: 0 if (f['fire'] is None or f['card']) else 10 / (10 + f['fire']['d']))
crack = np.zeros(N)
clicks = [hp(rng.standard_normal(800), 1500) * env(800, 0, 0.003) for _ in range(8)]
for j, i in enumerate(rng.integers(0, N - 800, int(plan['total'] * 40))): crack[i:i + 800] += clicks[j % 8] * rng.uniform(0.05, 0.3)
crack = crack * 0.6 + lp(rng.standard_normal(N), 250) * 0.15
drone = curve(lambda f: 1.0 if f.get('drone') else 0.0)
static = bp(rng.standard_normal(N), 800, 6000) * 0.05 + np.sin(2 * np.pi * 120 * tt) * 0.01
bed = (insects * night + room * inter + wind * dawn + crack * fireg + static * drone) * cardg
L += bed; Rr += bed

# ---------------------------------------------------------------- master: fades on the cards, glue, limit
# keep the braams audible over the cards
mix = np.stack([L, Rr], axis=1)
mix = np.tanh(mix * 1.4) / np.tanh(1.4)
mix /= max(1e-6, np.abs(mix).max()) / 0.89
from scipy.io import wavfile
wavfile.write(sys.argv[2], SR, (mix * 32767).astype(np.int16))
print('wrote', sys.argv[2], f'{len(mix) / SR:.1f}s')
