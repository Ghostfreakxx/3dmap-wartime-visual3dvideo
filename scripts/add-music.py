#!/usr/bin/env python3
"""Lay the quiet music bed under the narrated reels.

  python3 scripts/compose-music.py   # once: renders/music/{calm,tense}.wav
  python3 scripts/add-music.py       # renders/narrated/epNN.mp4 -> renders/final/epNN.mp4 + complete film

Mix: music low-passed (3.2 kHz, out of the voice's way), normalised to -30 LUFS (voice is -16 LUFS),
ducked a further ~8-10 dB while the narrator speaks (sidechain), 2 s fade-in / 3 s fade-out,
brick-wall limited. Video stream is copied, not re-encoded.
"""
import os
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = os.path.join(ROOT, "renders")
MOOD = {n: ("tense" if n in (5, 6, 7, 8, 10, 11, 12) else "calm") for n in range(1, 14)}
MUSIC_LUFS = -30


def duration(path):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]))


os.makedirs(os.path.join(R, "final"), exist_ok=True)
for n in range(1, 14):
    src = os.path.join(R, "narrated", f"ep{n:02d}.mp4")
    out = os.path.join(R, "final", f"ep{n:02d}.mp4")
    T = duration(src)
    filt = (
        f"[1:a]atrim=0:{T:.3f},asetpts=PTS-STARTPTS,lowpass=f=3200,"
        f"loudnorm=I={MUSIC_LUFS}:TP=-8:LRA=11,aresample=48000,"
        f"afade=t=in:d=2,afade=t=out:st={max(0, T - 3):.3f}:d=3[m];"
        "[0:a]aresample=48000,asplit=2[v][sc];"
        "[m][sc]sidechaincompress=threshold=0.03:ratio=6:attack=40:release=700[md];"
        "[v][md]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.89:level=false[a]"
    )
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-i", src, "-stream_loop", "-1", "-i", os.path.join(R, "music", f"{MOOD[n]}.wav"),
        "-filter_complex", filt, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-ar", "48000",
        "-t", f"{T:.3f}", "-movflags", "+faststart", out,
    ], check=True)
    print(f"ep{n:02d} + {MOOD[n]} music", flush=True)

with open(os.path.join(R, "final", "list.txt"), "w") as f:
    for n in range(1, 14):
        f.write(f"file '{os.path.join(R, 'final', f'ep{n:02d}.mp4')}'\n")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", os.path.join(R, "final", "list.txt"),
                "-c", "copy", "-movflags", "+faststart", os.path.join(R, "final", "ahom-kingdom-complete.mp4")], check=True)
print("complete film written")
