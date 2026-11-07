#!/usr/bin/env python3
"""Compose two original, royalty-free ambient beds for the reels (pure numpy synthesis).

  python3 scripts/compose-music.py          # -> renders/music/calm.wav, renders/music/tense.wav

calm  : D minor pads (Dm9 - Bb - F - C), soft bass, sparse high plucks
tense : E minor pads (Em - C - Am - B), lower register, soft low drum pulse (72 bpm)
Both: slow chord crossfades, light chorus, synthetic reverb, peak-normalised. Seeded, so reproducible.
"""
import os
import wave
import numpy as np

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "renders", "music")
rng = np.random.default_rng(1228)


def hz(note: str) -> float:
    names = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
    n, octave = note[:-1], int(note[-1])
    return 440.0 * 2 ** ((names[n] + 12 * (octave + 1) - 69) / 12)


def pad_voice(f: float, n: int, bright: float) -> np.ndarray:
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    for detune, pan in ((-0.0016, 0.25), (0.0, 0.5), (0.0017, 0.75)):
        ff = f * (1 + detune)
        lfo = 1 + 0.002 * np.sin(2 * np.pi * 0.13 * t + rng.random() * 6)
        ph = 2 * np.pi * ff * np.cumsum(lfo) / SR
        tone = np.sin(ph) + bright * 0.35 * np.sin(2 * ph) + bright * 0.12 * np.sin(3 * ph) + 0.05 * np.sin(4 * ph)
        out[:, 0] += tone * (1 - pan)
        out[:, 1] += tone * pan
    return out / 3


def chord_bed(chords, seconds_per_chord, total, bright, bass_oct_shift=-1):
    n_total = int(total * SR)
    out = np.zeros((n_total, 2))
    seg = int(seconds_per_chord * SR)
    fade = int(2.5 * SR)
    i = 0
    start = 0
    while start < n_total:
        notes = chords[i % len(chords)]
        n = min(seg + fade, n_total - start)
        env = np.ones(n)
        a = min(fade, n)
        env[:a] = np.sin(np.linspace(0, np.pi / 2, a)) ** 2
        env[-a:] *= np.cos(np.linspace(0, np.pi / 2, a)) ** 2
        layer = np.zeros((n, 2))
        for k, note in enumerate(notes):
            layer += pad_voice(hz(note), n, bright) * (0.9 if k else 1.0)
        root = notes[0]
        bass = hz(root[:-1] + str(int(root[-1]) + bass_oct_shift))
        tb = np.arange(n) / SR
        layer += 0.55 * np.sin(2 * np.pi * bass * tb)[:, None]
        out[start:start + n] += layer * env[:, None] / len(notes)
        start += seg
        i += 1
    return out


def plucks(chords, seconds_per_chord, total, every, octave_up=1, level=0.12):
    n_total = int(total * SR)
    out = np.zeros((n_total, 2))
    t = 0.0
    while t < total - 1:
        idx = int(t // seconds_per_chord) % len(chords)
        if rng.random() < 0.7:
            note = chords[idx][rng.integers(len(chords[idx]))]
            f = hz(note[:-1] + str(int(note[-1]) + octave_up))
            n = int(1.6 * SR)
            s = int(t * SR)
            n = min(n, n_total - s)
            tt = np.arange(n) / SR
            tone = (np.sin(2 * np.pi * f * tt) + 0.2 * np.sin(4 * np.pi * f * tt)) * np.exp(-tt * 3.2)
            pan = 0.3 + 0.4 * rng.random()
            out[s:s + n, 0] += tone * (1 - pan) * level
            out[s:s + n, 1] += tone * pan * level
        t += every
    return out


def drum_pulse(total, bpm=72, level=0.5):
    n_total = int(total * SR)
    out = np.zeros(n_total)
    beat = 60 / bpm
    pattern = [1, 0, 0, 0.6, 1, 0, 0, 0]  # soft "boom . . b boom . . ." per 8 beats
    t, k = 0.0, 0
    while t < total - 1:
        amp = pattern[k % len(pattern)]
        if amp:
            n = min(int(0.9 * SR), n_total - int(t * SR))
            tt = np.arange(n) / SR
            f = 52 + 38 * np.exp(-tt * 18)  # pitch drop
            body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 5.5)
            noise = rng.standard_normal(n) * np.exp(-tt * 40) * 0.08
            s = int(t * SR)
            out[s:s + n] += (body + noise) * amp * level
        t += beat
        k += 1
    return np.stack([out, out], axis=1)


def reverb(x, seconds=2.4, wet=0.32):
    n = int(seconds * SR)
    ir_t = np.arange(n) / SR
    out = np.zeros_like(x)
    for ch in range(2):
        ir = rng.standard_normal(n) * np.exp(-ir_t * 3.0 / seconds * 2.3)
        ir[: int(0.012 * SR)] = 0  # pre-delay
        ir /= np.sqrt(np.sum(ir ** 2))
        size = 1 << int(np.ceil(np.log2(len(x) + n)))
        wetsig = np.fft.irfft(np.fft.rfft(x[:, ch], size) * np.fft.rfft(ir, size), size)[: len(x)]
        out[:, ch] = x[:, ch] * (1 - wet) + wetsig * wet * 0.9
    return out


def write(path, x):
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.7
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    TOTAL = 120.0
    calm_chords = [["D3", "A3", "E4", "F4"], ["Bb2", "F3", "D4", "C4"], ["F2", "C3", "A3", "G4"], ["C3", "G3", "E4", "D4"]]
    calm = chord_bed(calm_chords, 8.0, TOTAL, bright=0.7) + plucks(calm_chords, 8.0, TOTAL, every=1.25)
    write(os.path.join(OUT, "calm.wav"), reverb(calm))
    tense_chords = [["E2", "B2", "G3", "D4"], ["C2", "G2", "E3", "B3"], ["A1", "E2", "C3", "G3"], ["B1", "F#2", "D#3", "A3"]]
    tense = chord_bed(tense_chords, 8.0, TOTAL, bright=1.0) * 1.1 + drum_pulse(TOTAL) + plucks(tense_chords, 8.0, TOTAL, every=2.5, octave_up=1, level=0.08)
    write(os.path.join(OUT, "tense.wav"), reverb(tense, seconds=2.0, wet=0.25))
    print("wrote", OUT)
