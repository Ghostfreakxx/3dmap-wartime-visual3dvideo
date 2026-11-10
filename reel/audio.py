"""Synthesises the reel's soundtrack: a bouncy beat, a boom on every cut and a few comic stings.
Writes audio.wav (48 kHz stereo). Everything is generated; no samples or existing songs are used."""
import wave
import numpy as np

SR, DUR, BPM = 48000, 35.0, 120
t = np.arange(int(SR * DUR)) / SR
rng = np.random.default_rng(5)
out = np.zeros_like(t)
BEAT = 60 / BPM


def add(sig, at, gain=1.0):
    i = int(at * SR)
    n = min(len(sig), len(out) - i)
    if n > 0:
        out[i:i + n] += gain * sig[:n]


def kick():
    x = np.arange(int(0.35 * SR)) / SR
    f = 45 + 110 * np.exp(-x / 0.03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x / 0.12)


def snare():
    x = np.arange(int(0.2 * SR)) / SR
    return (rng.standard_normal(len(x)) * 0.7 + np.sin(2 * np.pi * 190 * x) * 0.4) * np.exp(-x / 0.05)


def hat():
    x = np.arange(int(0.05 * SR)) / SR
    n = rng.standard_normal(len(x))
    return (n - np.convolve(n, np.ones(8) / 8, mode="same")) * np.exp(-x / 0.012)


def boom():                                   # deep thud for each scene cut
    x = np.arange(int(1.2 * SR)) / SR
    f = 34 + 70 * np.exp(-x / 0.06)
    return np.tanh(2.5 * np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-x / 0.4)


def blip(freq, length=0.09):
    x = np.arange(int(length * SR)) / SR
    return np.sign(np.sin(2 * np.pi * freq * x)) * np.exp(-x / (length / 3)) * 0.5


def bass(freq, length):
    x = np.arange(int(length * SR)) / SR
    return np.tanh(1.8 * np.sin(2 * np.pi * freq * x)) * np.minimum(1, (length - x) / 0.03) * np.minimum(1, x / 0.005)


def slide_down():                             # sad trombone-ish slide for "k"
    x = np.arange(int(0.7 * SR)) / SR
    f = 330 * np.exp(-x * 1.4)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x / 0.4) * 0.6


# beat from 3.2 s to 30.2 s, dropping out for the punchlines
RIFF = [55.0, 55.0, 65.41, 49.0, 55.0, 55.0, 73.42, 65.41]          # A, A, C, G, A, A, D, C
MUTE = [(17.4, 18.8), (26.0, 26.5)]
k = 0
at = 3.2
while at < 30.2:
    if not any(a <= at < b for a, b in MUTE):
        step = k % 8
        if step in (0, 4):
            add(kick(), at, 0.9)
        if step in (2, 6):
            add(snare(), at, 0.5)
        add(hat(), at, 0.22)
        add(bass(RIFF[step], BEAT / 2 * 0.8), at, 0.32)
    at += BEAT / 2
    k += 1

for cut in (0.15, 3.2, 8.4, 13.6, 19.4, 24.8, 30.2):                # boom on every cut
    add(boom(), cut, 1.0)
for tick in (4.1, 4.6, 5.1, 5.6):                                    # manifesto checkboxes
    add(blip(880), tick, 0.5)
add(blip(180, 0.25), 6.5, 0.9)                                       # the stamp
for i, msg in enumerate((14.9, 15.6, 16.3, 17.0)):                   # incoming messages
    add(blip(1200 + 80 * i, 0.07), msg, 0.45)
add(slide_down(), 18.2, 0.9)                                         # "k"
add(boom(), 0.7, 0.7)
add(boom(), 31.3, 1.1)                                               # "just anti-nonsense"
for i, f in enumerate((523.25, 659.25, 783.99)):                     # closing chime
    add(blip(f, 0.5) * 0.6, 32.6 + i * 0.12, 0.5)

out *= np.minimum(1, (DUR - t) / 1.0)
stereo = np.stack([out, out], axis=1)
stereo *= 0.8 / np.max(np.abs(stereo))
with wave.open("audio.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((stereo * 32767).astype("<i2").tobytes())
print("wrote audio.wav", f"{DUR:.0f}s")
