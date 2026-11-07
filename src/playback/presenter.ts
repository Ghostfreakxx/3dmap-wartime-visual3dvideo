"use client";

/**
 * Presenter <-> stage messaging over BroadcastChannel.
 * Works between tabs/windows of the same browser on the same device (e.g. iPad Split View,
 * or two windows on a desktop). Cross-device control needs a relay - see
 * docs/design/06-architecture-and-file-structure.md section 4.
 */
export const CHANNEL = "ahom-presenter";

export type PresenterCommand =
  | { type: "toggle" }
  | { type: "play" }
  | { type: "pause" }
  | { type: "next" }
  | { type: "prev" }
  | { type: "replay" }
  | { type: "seekBeat"; index: number }
  | { type: "speed"; value: number }
  | { type: "format"; value: "16x9" | "9x16" }
  | { type: "presentation"; value: boolean }
  | { type: "bookmark"; slot: number }
  | { type: "requestState" };

export interface StageStatus {
  type: "status";
  episode: number;
  beatIndex: number;
  beatCount: number;
  beatId: string;
  caption: string;
  narration: string;
  nextNarration: string | null;
  year: string;
  playing: boolean;
  speed: number;
  t: number;
  total: number;
  format: "16x9" | "9x16";
  presentation: boolean;
}

export function openChannel(): BroadcastChannel | null {
  try {
    return typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHANNEL);
  } catch {
    return null;
  }
}
