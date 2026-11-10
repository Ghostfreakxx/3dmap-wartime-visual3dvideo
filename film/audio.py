"""Synthesises the soundtrack for the film: a low drone, hill-drum pulse and section hits.
Writes audio.wav (48 kHz stereo). No samples or recordings are used."""
import wave
import numpy as np

SR, DUR = 48000, 92.0
t = np.arange(int(SR * DUR)) / SR
rng = np.random.default_rng(3)


def env(a, b, fade=1.0):
    """1 between a and b seconds, with linear fades."""
    return np.clip((t - a) / fade, 0, 1) * np.clip((b - t) / fade, 0, 1)


def tone(freq, detune=0.0):
    return np.sin(2 * np.pi * freq * t) + 0.5 * np.sin(2 * np.pi * freq * (1 + detune) * t + 1.3)


def drum(at, gain=1.0, f0=95.0, f1=42.0, decay=0.28):
    out = np.zeros_like(t)
    i0 = int(at * SR)
    n = min(int(1.6 * SR), len(t) - i0)
    if n <= 0:
        return out
    x = np.arange(n) / SR
    freq = f1 + (f0 - f1) * np.exp(-x / 0.05)
    body = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-x / decay)
    skin = rng.standard_normal(n) * np.exp(-x / 0.012) * 0.25
    out[i0:i0 + n] = gain * (body + skin)
    return out


# drone in D: root, fifth, octave, slowly breathing
drone = (0.55 * tone(73.42, 0.004) + 0.32 * tone(110.0, 0.003) + 0.22 * tone(146.83, 0.005))
drone *= 0.75 + 0.25 * np.sin(2 * np.pi * 0.07 * t)
minor = 0.16 * tone(174.61, 0.004) * env(17, 86, 4)          # F: the minor colour through the struggle
dark = 0.22 * tone(58.27, 0.003) * env(78.5, 86.5, 2)        # low B flat under annexation
major = (0.18 * tone(185.0, 0.003) + 0.14 * tone(293.66, 0.004)) * env(86, 92, 2.5)   # F sharp, D: release
pad = (drone + minor + dark + major) * env(0, 92, 3)

# drum pulse that tightens as the columns close in, and stops at annexation
drums = np.zeros_like(t)
for start, end, step, gain in [(19, 30, 2.0, 0.5), (31, 42, 1.0, 0.6), (43, 54, 1.0, 0.75),
                               (55, 66, 0.5, 0.7), (67, 78, 0.5, 0.8)]:
    k = 0
    at = float(start)
    while at < end:
        accent = 1.0 if k % 4 == 0 else 0.55
        drums += drum(at, gain * accent)
        at += step
        k += 1
for at in (31, 43, 55, 67):                                   # section hits
    drums += drum(at, 1.5, f0=70, f1=32, decay=0.7)
drums += drum(79, 1.9, f0=60, f1=27, decay=1.1)               # the last hit, then silence

air = rng.standard_normal(len(t))
air = np.convolve(air, np.ones(40) / 40, mode="same") * 0.05 * env(0, 92, 4)

mono = 0.5 * pad + 0.9 * drums + air
left = mono + 0.04 * np.roll(air, 700)
right = mono + 0.04 * np.roll(air, -900)
stereo = np.stack([left, right], axis=1)
stereo *= 0.7 / np.max(np.abs(stereo))                        # leave headroom

with wave.open("audio.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((stereo * 32767).astype("<i2").tobytes())
print("wrote audio.wav", f"{DUR:.0f}s")
