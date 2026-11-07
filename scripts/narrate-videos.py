#!/usr/bin/env python3
"""Add synthetic narration (Piper TTS, voice "en_US-ryan-high") to the rendered reels.

  pip install piper-tts==1.3.0
  # voice files from https://huggingface.co/rhasspy/piper-voices (en/en_US/ryan/high) into ./voices
  python3 scripts/narrate-videos.py        # renders/epNN.mp4 -> renders/narrated/epNN.mp4 + complete film

Each beat's `narration` text is synthesised, sped up (at most x1.15) only if it overruns its beat,
placed at the beat start, loudness-normalised (-16 LUFS) and muxed without re-encoding the video.
Env: PIPER (path to the piper binary), VOICES_DIR.
"""
import json, subprocess, os
import sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PIPER = os.environ.get("PIPER", "piper")
VOICES = os.environ.get("VOICES_DIR", os.path.join(ROOT, "voices"))
S = os.path.join(ROOT, "renders", "_narration")
R = os.path.join(ROOT, "renders")
V = "en_US-ryan-high"; LEAD = 0.5
os.makedirs(f"{R}/narrated", exist_ok=True)
os.makedirs(S, exist_ok=True)
dur = lambda f: float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]))
report = []
for n in range(1, 14):
    ep = json.load(open(fROOT + "/data/episodes/ep{n:02d}.json"))
    clips, t0 = [], 0.0
    for i, b in enumerate(ep["beats"]):
        if b["narration"].strip():
            out = f"{S}/ep{n}_{i}.wav"
            avail = b["durationMs"] / 1000 - LEAD - 0.4
            ls = 1.0
            for _ in range(4):
                subprocess.run([PIPER, "-m", f"{VOICES}/{V}.onnx", "-f", out, "--length-scale", f"{ls:.3f}", "--sentence-silence", "0.3"],
                               input=b["narration"].encode(), check=True, capture_output=True)
                d = dur(out)
                if d <= avail: break
                ls = max(0.87, ls * avail / d * 0.98)
            if d > avail + 0.3: report.append(f"ep{n} {b['id']}: {d:.1f}s > {avail:.1f}s")
            clips.append((out, t0 + LEAD))
        t0 += b["durationMs"] / 1000
    inputs = sum([["-i", c] for c, _ in clips], [])
    filt = "".join(f"[{i+1}:a]adelay={int(s*1000)}|{int(s*1000)},aresample=48000[a{i}];" for i, (_, s) in enumerate(clips))
    filt += "".join(f"[a{i}]" for i in range(len(clips))) + f"amix=inputs={len(clips)}:normalize=0,apad,atrim=0:{t0},loudnorm=I=-16:TP=-1.5,aresample=48000[aout]"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{R}/ep{n:02d}.mp4", *inputs, "-filter_complex", filt,
                    "-map", "0:v", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2",
                    "-t", str(t0), "-movflags", "+faststart", f"{R}/narrated/ep{n:02d}.mp4"], check=True)
    print(f"ep{n:02d} narrated ({t0:.0f}s, {len(clips)} lines)", flush=True)
with open(f"{R}/narrated/list.txt", "w") as f:
    for n in range(1, 14): f.write(f"file '{R}/narrated/ep{n:02d}.mp4'\n")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"{R}/narrated/list.txt", "-c", "copy", "-movflags", "+faststart",
                f"{R}/narrated/ahom-kingdom-complete-narrated.mp4"], check=True)
print("overruns:", report or "none")
