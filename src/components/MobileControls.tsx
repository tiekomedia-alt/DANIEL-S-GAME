import React, { useEffect, useState } from 'react';

// ── Scale hook ────────────────────────────────────────────────────────────────
export function useCanvasScale(CW: number, CH: number, controlsH = 160) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const calc = () => {
      const s = Math.min(
        window.innerWidth / CW,
        (window.innerHeight - controlsH - 56) / CH,
        1
      );
      setScale(Math.max(0.25, s));
    };
    calc();
    window.addEventListener('resize', calc);
    window.addEventListener('orientationchange', calc);
    return () => {
      window.removeEventListener('resize', calc);
      window.removeEventListener('orientationchange', calc);
    };
  }, [CW, CH, controlsH]);
  return scale;
}

export const isMobile = (): boolean =>
  typeof window !== 'undefined' && (window.innerWidth < 900 || 'ontouchstart' in window);

// ── Single touch button ───────────────────────────────────────────────────────
function TB({
  label, code, w = 64, h = 64, style,
}: {
  label: string; code: string; w?: number; h?: number; style?: React.CSSProperties;
}) {
  const fire = (down: boolean) =>
    window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));

  return (
    <div
      onTouchStart={e => { e.preventDefault(); fire(true); }}
      onTouchEnd={e => { e.preventDefault(); fire(false); }}
      onTouchCancel={e => { e.preventDefault(); fire(false); }}
      onMouseDown={e => { e.preventDefault(); fire(true); }}
      onMouseUp={() => fire(false)}
      onMouseLeave={() => fire(false)}
      style={{
        width: w, height: h,
        borderRadius: 14,
        background: 'rgba(255,255,255,0.13)',
        border: '2px solid rgba(255,255,255,0.38)',
        color: '#fff',
        fontSize: Math.round(h * 0.4),
        fontWeight: 900,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        userSelect: 'none',
        WebkitUserSelect: 'none' as React.CSSProperties['WebkitUserSelect'],
        touchAction: 'none',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      {label}
    </div>
  );
}

const WRAP: React.CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 20px 18px',
  boxSizing: 'border-box' as const,
  background: 'rgba(0,0,0,0.88)',
  borderTop: '2px solid rgba(255,255,255,0.12)',
  zIndex: 100,
};

// ── D-pad ─────────────────────────────────────────────────────────────────────
function Dpad() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 60px)', gridTemplateRows: 'repeat(2, 60px)', gap: 5 }}>
      <span />
      <TB label="▲" code="ArrowUp" w={60} h={60} />
      <span />
      <TB label="◀" code="ArrowLeft" w={60} h={60} />
      <TB label="▼" code="ArrowDown" w={60} h={60} />
      <TB label="▶" code="ArrowRight" w={60} h={60} />
    </div>
  );
}

// ── LR pair ───────────────────────────────────────────────────────────────────
function LR() {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <TB label="◀" code="ArrowLeft" w={80} h={64} />
      <TB label="▶" code="ArrowRight" w={80} h={64} />
    </div>
  );
}

// ── Action button ─────────────────────────────────────────────────────────────
function Action({ label, code, color }: { label: string; code: string; color: string }) {
  return (
    <TB label={label} code={code} w={80} h={80}
      style={{ borderRadius: 40, fontSize: 32, background: `${color}33`, borderColor: `${color}99` }}
    />
  );
}

// ── Exported control layouts ──────────────────────────────────────────────────

/** Platformer & Minecraft: ← → + JUMP */
export function ControlsLRJump() {
  return (
    <div style={WRAP}>
      <LR />
      <Action label="⬆" code="Space" color="#facc15" />
    </div>
  );
}

/** Diamond Rush: full D-pad */
export function ControlsDpad() {
  return (
    <div style={{ ...WRAP, justifyContent: 'center' }}>
      <Dpad />
    </div>
  );
}

/** Space Defender: D-pad + SHOOT */
export function ControlsDpadShoot() {
  return (
    <div style={WRAP}>
      <Dpad />
      <Action label="🔥" code="Space" color="#ef4444" />
    </div>
  );
}

/** Road Racer: big left / right tap zones */
export function ControlsLROnly() {
  return (
    <div style={{ ...WRAP, justifyContent: 'center', gap: 16 }}>
      <TB label="◀ LEFT" code="ArrowLeft" w={140} h={80} style={{ borderRadius: 16, fontSize: 20 }} />
      <TB label="RIGHT ▶" code="ArrowRight" w={140} h={80} style={{ borderRadius: 16, fontSize: 20 }} />
    </div>
  );
}
