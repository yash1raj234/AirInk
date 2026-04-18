export default function Navbar() {
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50">
      <div
        className="flex items-center gap-2.5 px-6 py-2.5 rounded-full"
        style={{
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.14)',
          boxShadow:
            '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
        }}
      >
        {/* Ink-drop icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="ng" x1="6" y1="2" x2="18" y2="22" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00FF87" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>
          </defs>
          <path
            d="M12 2C12 2 5 9.5 5 15a7 7 0 0014 0C19 9.5 12 2 12 2z"
            fill="url(#ng)"
            opacity="0.9"
          />
          <ellipse cx="9.5" cy="13" rx="1.5" ry="2.2" fill="white" opacity="0.35" transform="rotate(-20 9.5 13)" />
        </svg>

        <span
          className="font-bold tracking-[0.22em] text-sm uppercase select-none"
          style={{
            background: 'linear-gradient(120deg, #e0f0ff 0%, #a8d8ff 40%, #00FF87 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          AirInk
        </span>
      </div>
    </div>
  );
}
