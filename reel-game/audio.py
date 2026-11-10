"""Synthesises an original chiptune soundtrack and sound effects for the reel.
Writes audio.wav (48 kHz stereo). Nothing is sampled from any game or song."""
import wave
import numpy as np

SR, DUR, BPM = 48000, 44.0, 140
t = np.arange(int(SR * DUR)) / SR
rng = np.random.default_rng(11)
out = np.zeros_like(t)
STEP = 60 / BPM / 4                       # sixteenth note


def add(sig, at, gain=1.0):
    i = int(at * SR)
    n = min(len(sig), len(out) - i)
    if n > 0 and i >= 0:
        out[i:i + n] += gain * sig[:n]


def square(freq, length, duty=0.5, decay=None):
    x = np.arange(int(length * SR)) / SR
    phase = (np.cumsum(np.broadcast_to(freq, x.shape)) / SR) % 1.0
    s = np.where(phase < duty, 1.0, -1.0)
    env = np.exp(-x / decay) if decay else np.minimum(1, (length - x) / 0.01)
    return s * env


def tri(freq, length):
    x = np.arange(int(length * SR)) / SR
    return (2 * np.abs(2 * ((freq * x) % 1.0) - 1) - 1) * np.minimum(1, (length - x) / 0.01)


def noise(length, decay):
    x = np.arange(int(length * SR)) / SR
    return rng.standard_normal(len(x)) * np.exp(-x / decay)


def sweep(f0, f1, length, duty=0.5):
    x = np.arange(int(length * SR)) / SR
    return square(f0 * (f1 / f0) ** (x / length), length, duty) * np.exp(-x / (length * 0.6))


N = {'A2': 110.0, 'F2': 87.31, 'C3': 130.81, 'G2': 98.0, 'A3': 220.0, 'C4': 261.63, 'E4': 329.63, 'F3': 174.61,
     'A4': 440.0, 'G3': 196.0, 'B3': 246.94, 'D4': 293.66, 'E3': 164.81, 'G4': 392.0, 'C5': 523.25, 'D5': 587.33, 'E5': 659.25}
BARS = [('A2', ['A3', 'C4', 'E4', 'A4']), ('F2', ['F3', 'A3', 'C4', 'F3']),
        ('C3', ['C4', 'E4', 'G4', 'C5']), ('G2', ['G3', 'B3', 'D4', 'G4'])]
LEAD = ['E5', None, 'D5', 'C5', None, 'A4', None, 'C5', 'D5', None, 'E5', None, 'C5', None, 'A4', None]


def music(start, end, lead=True, drums=True):
    k = 0
    at = start
    while at < end - 1e-6:
        bar, step = (k // 16) % 4, k % 16
        root, arp = BARS[bar]
        add(square(N[arp[step % 4]], STEP * 0.9, 0.25), at, 0.16)
        if step % 4 == 0:
            add(tri(N[root], STEP * 3.6), at, 0.42)
        if lead and LEAD[step] and bar % 2 == 0:
            add(square(N[LEAD[step]], STEP * 1.6, 0.5), at, 0.15)
        if drums:
            if step % 8 == 0:
                add(sweep(160, 45, 0.12), at, 0.5)
            if step % 8 == 4:
                add(noise(0.12, 0.03), at, 0.3)
            if step % 2 == 0:
                add(noise(0.03, 0.006), at, 0.1)
        at += STEP
        k += 1


music(4.0, 11.0, lead=False)              # character select
music(11.0, 17.0)                         # round 1
music(18.4, 24.0, lead=False)             # round 2
music(25.3, 31.0)                         # boss
music(31.0, 37.3, lead=False, drums=False)

# title: power-on sweep and "insert vote" chime
add(sweep(110, 880, 0.5), 0.5, 0.5)
for i, f in enumerate((523.25, 783.99)):
    add(square(f, 0.25, 0.5, 0.12), 2.1 + i * 0.12, 0.4)
for i in range(6):                        # cursor hopping between the fighters
    add(square(880, 0.05, 0.5, 0.02), 4.4 + i * 0.65, 0.4)
add(square(1318.5, 0.3, 0.5, 0.1), 8.3, 0.45)
for at in (13.0, 13.9, 14.8):             # the three shots
    add(sweep(1400, 300, 0.25, 0.25), at, 0.5)
    add(noise(0.1, 0.03), at + 0.75, 0.35)
for i, f in enumerate((523.25, 659.25, 783.99, 1046.5)):   # victory jingle
    add(square(f, 0.22, 0.5, 0.12), 17.3 + i * 0.13, 0.45)
add(sweep(220, 70, 0.4), 19.0, 0.6)       # move locked
for at in (20.0, 20.9, 21.8):
    add(square(660, 0.08, 0.5, 0.03), at, 0.4)
for i in range(4):                        # boss alarm
    add(square(440 if i % 2 == 0 else 330, 0.14, 0.5), 24.1 + i * 0.16, 0.4)
for at in (26.6, 27.4, 28.2):             # attacks that do nothing
    add(sweep(180, 90, 0.18), at, 0.55)
for i, at in enumerate((31.8, 32.6, 33.4)):
    add(square(700 + 120 * i, 0.4, 0.125, 0.25), at, 0.3)
add(sweep(300, 60, 0.5), 34.3, 0.5)
for i, f in enumerate((392.0, 329.63, 261.63, 196.0, 130.81)):   # game over, falling
    add(square(f, 0.34, 0.5, 0.2), 37.7 + i * 0.26, 0.5)
for i in range(10):                       # countdown
    add(square(990 if i < 9 else 330, 0.07 if i < 9 else 0.5, 0.5, 0.03 if i < 9 else 0.3), 39.0 + i * 0.5, 0.4)

out *= np.minimum(1, (DUR - t) / 0.8)
stereo = np.stack([out, out], axis=1)
stereo *= 0.8 / np.max(np.abs(stereo))
with wave.open("audio.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((stereo * 32767).astype("<i2").tobytes())
print("wrote audio.wav", f"{DUR:.0f}s")
