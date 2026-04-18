'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface HandState {
  fingerPosition: { x: number; y: number } | null;
  isDrawing: boolean;
  isClear: boolean;
  isPaused: boolean;
}

interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
}

interface HandsResults {
  multiHandLandmarks?: LandmarkPoint[][];
}

interface HandsInstance {
  setOptions(opts: Record<string, unknown>): void;
  onResults(cb: (results: HandsResults) => void): void;
  send(opts: { image: HTMLVideoElement }): Promise<void>;
  close(): void;
}

declare global {
  interface Window {
    Hands?: new (config: Record<string, unknown>) => HandsInstance;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const el = document.createElement('script');
    el.src = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Script load failed: ${src}`));
    document.head.appendChild(el);
  });
}

function isFingerUp(lm: LandmarkPoint[], tip: number, base: number): boolean {
  return lm[tip].y < lm[base].y;
}

function analyzeHand(lm: LandmarkPoint[]): {
  drawing: boolean;
  clear: boolean;
  paused: boolean;
} {
  const indexUp = isFingerUp(lm, 8, 6);
  const middleUp = isFingerUp(lm, 12, 10);
  const ringUp = isFingerUp(lm, 16, 14);
  const pinkyUp = isFingerUp(lm, 20, 18);
  const upCount = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;

  if (upCount >= 4) return { drawing: false, clear: true, paused: false };
  if (upCount === 0) return { drawing: false, clear: false, paused: true };
  if (indexUp && !middleUp && !ringUp && !pinkyUp)
    return { drawing: true, clear: false, paused: false };
  return { drawing: false, clear: false, paused: true };
}

export function useHandTracking(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasWidth: number,
  canvasHeight: number
): HandState {
  const [state, setState] = useState<HandState>({
    fingerPosition: null,
    isDrawing: false,
    isClear: false,
    isPaused: false,
  });

  const buildProcessFrame = useCallback(
    (hands: HandsInstance) => {
      let rafId = 0;
      function loop() {
        const video = videoRef.current;
        if (video && video.readyState >= 2 && !video.paused) {
          hands.send({ image: video }).catch(() => {});
        }
        rafId = requestAnimationFrame(loop);
      }
      rafId = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(rafId);
    },
    [videoRef]
  );

  useEffect(() => {
    // Per-invocation flag — safe against React Strict Mode double-invoke
    let cancelled = false;
    let cancelLoop: (() => void) | null = null;
    let handsInstance: HandsInstance | null = null;

    loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js')
      .then(() => {
        if (cancelled || !window.Hands) return;

        const hands = new window.Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5,
        });

        hands.onResults((results: HandsResults) => {
          if (cancelled) return;

          if (!results.multiHandLandmarks?.length) {
            setState((prev) => ({
              ...prev,
              fingerPosition: null,
              isDrawing: false,
              isClear: false,
              isPaused: false,
            }));
            return;
          }

          const lm = results.multiHandLandmarks[0];
          const { drawing, clear, paused } = analyzeHand(lm);
          // Mirror x to match CSS scaleX(-1) on the video element
          const x = (1 - lm[8].x) * canvasWidth;
          const y = lm[8].y * canvasHeight;

          setState({ fingerPosition: { x, y }, isDrawing: drawing, isClear: clear, isPaused: paused });
        });

        handsInstance = hands;
        cancelLoop = buildProcessFrame(hands);
      })
      .catch(console.error);

    return () => {
      cancelled = true;
      cancelLoop?.();
      handsInstance?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasWidth, canvasHeight, buildProcessFrame]);

  return state;
}
