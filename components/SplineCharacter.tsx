'use client';

import dynamic from 'next/dynamic';

// Use the regular (non-async) Spline package — the /next variant is an async
// Server Component and cannot be used inside Client Components.
const Spline = dynamic(() => import('@splinetool/react-spline'), { ssr: false });

export default function SplineCharacter() {
  return (
    <div
      className="absolute bottom-0 left-0 z-10 pointer-events-none"
      style={{ width: 320, height: 400 }}
    >
      <Spline scene="https://prod.spline.design/sEJCDzeA4Wv2SlKT/scene.splinecode" />
    </div>
  );
}
