'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import Toolbar from '@/components/Toolbar';

const CameraCanvas = dynamic(() => import('@/components/CameraCanvas'), { ssr: false });

declare global {
  interface Window {
    VANTA?: { CLOUDS: (opts: Record<string, unknown>) => { destroy: () => void } };
    THREE?: unknown;
  }
}

export default function Home() {
  const [selectedColor, setSelectedColor] = useState('#FFFFFF');
  const [brushSize, setBrushSize] = useState(8);
  const [clearTrigger, setClearTrigger] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'pending' | 'granted' | 'denied'>('pending');

  const canvasRef = useRef<HTMLCanvasElement>(null);


  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    setClearTrigger(true);
    setTimeout(() => setClearTrigger(false), 100);
  }, []);

  const handleSave = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cardEl = canvas.parentElement;
    if (!cardEl) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const shot = await html2canvas(cardEl, {
        useCORS: true,
        allowTaint: true,
        scale: 1,
        backgroundColor: null,
        logging: false,
      });
      const a = document.createElement('a');
      a.download = 'airink-drawing.png';
      a.href = shot.toDataURL('image/png');
      a.click();
    } catch {
      // Fallback: save drawing layer only
      const a = document.createElement('a');
      a.download = 'airink-drawing.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    }
  }, []);

  return (
    <>
      {/* Static image background */}
      <div
        className="fixed inset-0 w-full h-full z-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/sunset.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />

      {/* App layer */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
        {/* Camera card — centered */}
        <div>
          <CameraCanvas
            ref={canvasRef}
            color={selectedColor}
            brushSize={brushSize}
            onClearExternal={clearTrigger}
            onPermissionChange={setCameraPermission}
          />
        </div>

        <Toolbar
          selectedColor={selectedColor}
          brushSize={brushSize}
          onColorChange={setSelectedColor}
          onBrushSizeChange={setBrushSize}
          onClear={handleClear}
          onSave={handleSave}
        />
      </div>


    </>
  );
}
