'use client';

import { useEffect, useRef, useState } from 'react';

interface LandmarkPoint { x: number; y: number; z: number; }
interface HandsResults { multiHandLandmarks?: LandmarkPoint[][]; }
interface HandsInstance {
  setOptions(opts: Record<string, unknown>): void;
  onResults(cb: (r: HandsResults) => void): void;
  send(opts: { image: HTMLVideoElement }): Promise<void>;
  close(): void;
}
declare global {
  interface Window { Hands?: new (cfg: Record<string, unknown>) => HandsInstance; }
}

interface CameraCanvasProps {
  color: string;
  brushSize: number;
  onClearExternal?: boolean;
  onPermissionChange: (s: 'pending' | 'granted' | 'denied') => void;
  ref?: React.RefObject<HTMLCanvasElement | null>;
}

const GLOW: Record<string, string> = {
  '#FFFFFF': '0 0 18px 3px rgba(255,255,255,0.35)',
  '#00FF87': '0 0 18px 3px rgba(0,255,135,0.35)',
  '#38BDF8': '0 0 18px 3px rgba(56,189,248,0.35)',
  '#F472B6': '0 0 18px 3px rgba(244,114,182,0.35)',
  '#FBBF24': '0 0 18px 3px rgba(251,191,36,0.35)',
};

const STICKERS = [
  { src: '/stikers/Smile.png', initial: { top: '10%', left: '18%' }, rotate: 'rotate-12' },
  { src: '/stikers/Star.png', initial: { top: '25%', right: '8%' }, rotate: '-rotate-6' },
  { src: '/stikers/horn.png', initial: { bottom: '18%', left: '12%' }, rotate: '-rotate-12' },
  { src: '/stikers/leaf.png', initial: { bottom: '12%', right: '22%' }, rotate: 'rotate-[15deg]' },
  { src: '/stikers/red-lips.png', initial: { top: '65%', left: '6%' }, rotate: '-rotate-[8deg]' },
];

function DraggableSticker({ src, initial, rotate }: { src: string; initial: React.CSSProperties; rotate?: string }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    (e.target as HTMLImageElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    startPos.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!isDragging) return;
    setPos({
      x: e.clientX - startPos.current.x,
      y: e.clientY - startPos.current.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLImageElement>) => {
    (e.target as HTMLImageElement).releasePointerCapture(e.pointerId);
    setIsDragging(false);
  };

  return (
    <img
      src={src}
      className={`absolute w-20 h-20 md:w-28 md:h-28 object-contain cursor-grab active:cursor-grabbing z-50 drop-shadow-xl ${rotate || ''} ${isDragging ? 'opacity-80' : 'hover:opacity-90'}`}
      style={{
        ...initial,
        translate: `${pos.x}px ${pos.y}px`,
        userSelect: 'none',
        pointerEvents: 'auto',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      draggable={false}
      alt="sticker"
    />
  );
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const el = document.createElement('script');
    el.src = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed: ${src}`));
    document.head.appendChild(el);
  });
}

// Calculate initial dimensions on first render (component is client-only, window always exists)
function initialDims() {
  if (typeof window === 'undefined') return { w: 880, h: 540 };
  return { w: Math.round(window.innerWidth * 0.55), h: Math.round(window.innerHeight * 0.65) };
}

export default function CameraCanvas({
  color,
  brushSize,
  onClearExternal,
  onPermissionChange,
  ref,
}: CameraCanvasProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const internalRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = ref ?? internalRef;

  const [dims, setDims] = useState(initialDims);
  const [permission, setPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [isDrawing, setIsDrawing] = useState(false);

  // Keep color/brush in refs so the drawing callback always reads fresh values
  const colorRef = useRef(color);
  const brushRef = useRef(brushSize);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { brushRef.current = brushSize; }, [brushSize]);

  // Resize
  useEffect(() => {
    function update() {
      setDims({ w: Math.round(window.innerWidth * 0.55), h: Math.round(window.innerHeight * 0.65) });
    }
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // External clear (toolbar button)
  useEffect(() => {
    if (!onClearExternal) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }, [onClearExternal, canvasRef]);

  // Camera
  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: 1280 }, facingMode: 'user' } })
      .then((s) => {
        stream = s;
        if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play().catch(() => {}); }
        setPermission('granted');
        onPermissionChange('granted');
      })
      .catch(() => { setPermission('denied'); onPermissionChange('denied'); });
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [onPermissionChange]);

  // Hand tracking + drawing — single integrated loop, no React state in hot path
  useEffect(() => {
    if (permission !== 'granted') return;

    let cancelled = false;
    let hands: HandsInstance | null = null;
    let rafId = 0;
    const lastPos = { current: null as { x: number; y: number } | null };

    loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js')
      .then(() => {
        if (cancelled || !window.Hands) return;

        hands = new window.Hands({ locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5,
        });

        hands.onResults((results: HandsResults) => {
          if (cancelled) return;
          const canvas = canvasRef.current;
          const video = videoRef.current;
          if (!canvas || !video) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          // Sync canvas resolution to video native resolution for accurate 1:1 mapping
          if (video.videoWidth > 0 && canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
          if (video.videoHeight > 0 && canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

          if (!results.multiHandLandmarks?.length) {
            lastPos.current = null;
            setIsDrawing(false);
            return;
          }

          let openPalmCount = 0;
          for (const handLm of results.multiHandLandmarks) {
            const iUp = handLm[8].y < handLm[6].y;
            const mUp = handLm[12].y < handLm[10].y;
            const rUp = handLm[16].y < handLm[14].y;
            const pUp = handLm[20].y < handLm[18].y;
            if ([iUp, mUp, rUp, pUp].filter(Boolean).length >= 4) {
              openPalmCount++;
            }
          }

          // Two open palms → clear canvas
          if (openPalmCount >= 2) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            lastPos.current = null;
            setIsDrawing(false);
            return;
          }

          // Use the primary hand for drawing
          const lm = results.multiHandLandmarks[0];
          const indexUp  = lm[8].y  < lm[6].y;
          const middleUp = lm[12].y < lm[10].y;
          const ringUp   = lm[16].y < lm[14].y;
          const pinkyUp  = lm[20].y < lm[18].y;

          // Only index finger → draw
          if (indexUp && !middleUp && !ringUp && !pinkyUp) {
            // Because canvas CSS has scaleX(-1), drawing natively directly matches!
            const x = lm[8].x * canvas.width;
            const y = lm[8].y * canvas.height;

            const c = colorRef.current;
            const sz = brushRef.current;

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (!lastPos.current) {
              ctx.beginPath();
              ctx.arc(x, y, sz / 2, 0, Math.PI * 2);
              ctx.fillStyle = c;
              ctx.fill();
            } else {
              ctx.beginPath();
              ctx.moveTo(lastPos.current.x, lastPos.current.y);
              ctx.lineTo(x, y);
              ctx.strokeStyle = c;
              ctx.lineWidth = sz;
              ctx.stroke();
            }
            lastPos.current = { x, y };
            setIsDrawing(true);
            return;
          }

          // Any other gesture → pause
          lastPos.current = null;
          setIsDrawing(false);
        });

        // Async RAF loop — awaits MediaPipe worker to prevent dropping frames
        async function loop() {
          if (cancelled) return;
          const v = videoRef.current;
          if (v && v.readyState >= 2 && !v.paused) {
            try {
              await hands!.send({ image: v });
            } catch (err) {
               // ignore pipeline sync errors
            }
          }
          if (!cancelled) rafId = requestAnimationFrame(loop);
        }
        rafId = requestAnimationFrame(loop);
      })
      .catch(console.error);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      hands?.close();
    };
  }, [permission, canvasRef]);

  const glow = GLOW[color] ?? `0 0 18px 3px ${color}55`;

  return (
    <div
      className="relative rounded-3xl overflow-hidden flex-shrink-0"
      style={{
        width: dims.w,
        height: dims.h,
        border: '2.5px solid rgba(255, 255, 255, 0.8)',
        transition: 'border-color 0.4s ease',
      }}
    >
      {/* Denied */}
      {permission === 'denied' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 text-white gap-3">
          <svg className="w-11 h-11 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3l18 18" />
          </svg>
          <p className="font-semibold">Camera access denied</p>
          <p className="text-sm text-white/50 text-center px-8">
            Allow camera access in browser settings and reload.
          </p>
        </div>
      )}

      {/* Loading */}
      {permission === 'pending' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 text-white gap-3">
          <div className="w-9 h-9 border-2 border-white/25 border-t-white rounded-full animate-spin" />
          <p className="text-sm text-white/60">Waiting for camera…</p>
        </div>
      )}

      {/* Webcam — mirrored */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover z-0"
        style={{ transform: 'scaleX(-1)' }}
        autoPlay playsInline muted
      />

      {/* Drawing canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover z-10"
        style={{ transform: 'scaleX(-1)', background: 'transparent' }}
      />

      {/* Draggable Stickers */}
      {permission === 'granted' && STICKERS.map((s, i) => (
        <DraggableSticker key={i} src={s.src} initial={s.initial} rotate={s.rotate} />
      ))}

      {/* Status pill */}
      {permission === 'granted' && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 frosted-dark px-2.5 py-1 rounded-full">
          <span
            className="w-1.5 h-1.5 rounded-full transition-colors duration-200"
            style={{ background: isDrawing ? '#00FF87' : 'rgba(255,255,255,0.3)' }}
          />
          <span className="text-xs text-white/60 select-none">
            {isDrawing ? 'Drawing' : 'Ready'}
          </span>
        </div>
      )}
    </div>
  );
}
