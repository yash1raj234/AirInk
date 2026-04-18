'use client';

import { useEffect, useRef } from 'react';

interface DrawingOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  fingerPosition: { x: number; y: number } | null;
  isDrawing: boolean;
  isClear: boolean;
  color: string;
  brushSize: number;
}

export function useDrawing({
  canvasRef,
  fingerPosition,
  isDrawing,
  isClear,
  color,
  brushSize,
}: DrawingOptions): void {
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const isDrawingRef = useRef(false);

  // Clear canvas when isClear fires
  useEffect(() => {
    if (!isClear) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    lastPosRef.current = null;
  }, [isClear, canvasRef]);

  // Draw on canvas based on finger position
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!isDrawing || !fingerPosition) {
      // Reset last pos so next draw starts fresh (no line jump)
      lastPosRef.current = null;
      isDrawingRef.current = false;
      return;
    }

    const { x, y } = fingerPosition;

    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 1;

    if (!isDrawingRef.current || !lastPosRef.current) {
      // Start a new path segment
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      isDrawingRef.current = true;
    } else {
      // Connect to previous point
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    lastPosRef.current = { x, y };
  }, [fingerPosition, isDrawing, color, brushSize, canvasRef]);
}
