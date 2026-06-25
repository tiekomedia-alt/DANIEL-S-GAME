import React, { useState } from 'react';
import MinecraftGame from './games/minecraft/MinecraftGame';
import DiamondRush from './games/diamondRush/DiamondRush';
import SpaceDefender from './games/spaceDefender/SpaceDefender';
import RacingGame from './games/racing/RacingGame';
import Platformer from './games/platformer/Platformer';

type GameId = 'minecraft' | 'diamond-rush' | 'space-defender' | 'racing' | 'platformer' | null;

const GAMES = [
  {
    id: 'minecraft' as const,
    title: "Daniel's Minecraft",
    icon: '⛏️',
    description: 'Mine blocks, build worlds, and become the hero!',
    badge: '🎁 Surprise!',
    gradient: 'linear-gradient(135deg, #2f7d32, #48b04d)',
    glowColor: 'rgba(76,175,80,0.35)',
    borderActive: 'rgba(102,187,106,0.7)',
    stat: 'Best Score: 0 ⭐',
  },
  {
    id: 'diamond-rush' as const,
    title: 'Diamond Rush',
    icon: '💎',
    description: 'Collect diamonds, dodge boulders, and find the golden door.',
    gradient: 'linear-gradient(135deg, #243b96, #4466dd)',
    glowColor: 'rgba(68,102,221,0.35)',
    borderActive: 'rgba(121,134,203,0.7)',
    stat: 'Diamonds: 0 / 4',
  },
  {
    id: 'space-defender' as const,
    title: 'Space Defender',
    icon: '🚀',
    description: 'Blast aliens and protect the galaxy!',
    gradient: 'linear-gradient(135deg, #5b21b6, #a21caf)',
    glowColor: 'rgba(147,51,234,0.35)',
    borderActive: 'rgba(206,147,216,0.7)',
    stat: 'Wave 1',
  },
  {
    id: 'racing' as const,
    title: 'Road Racer',
    icon: '🏎️',
    description: 'Dodge traffic, collect stars, and race for a high score.',
    gradient: 'linear-gradient(135deg, #b91c1c, #ef4444)',
    glowColor: 'rgba(239,68,68,0.35)',
    borderActive: 'rgba(239,154,154,0.7)',
    stat: 'Best Speed: 0 km/h',
  },
  {
    id: 'platformer' as const,
    title: 'Super Daniel Run',
    icon: '⭐',
    description: 'Jump across platforms, collect stars, and stomp enemies.',
    gradient: 'linear-gradient(135deg, #ea580c, #facc15)',
    glowColor: 'rgba(249,115,22,0.35)',
    borderActive: 'rgba(255,215,0,0.7)',
    stat: 'Stars: 0 / 6',
  },
];

const MYSTERY_CARD = {
  id: null,
  title: 'Mystery Portal',
  icon: '❓',
  description: 'A new adventure is coming soon...',
  gradient: 'linear-gradient(135deg, #334155, #0f172a)',
  glowColor: 'transparent',
  borderActive: 'rgba(255,255,255,0.2)',
  stat: '',
  disabled: true,
};

export default function App() {
  const [currentGame, setCurrentGame] = useState<GameId>(null);
  const back = () => setCurrentGame(null);

  if (currentGame === 'minecraft')     return <MinecraftGame onBack={back} />;
  if (currentGame === 'diamond-rush')  return <DiamondRush onBack={back} />;
  if (currentGame === 'space-defender') return <SpaceDefender onBack={back} />;
  if (currentGame === 'racing')        return <RacingGame onBack={back} />;
  if (currentGame === 'platformer')    return <Platformer onBack={back} />;

  return (
    <div style={{
      minHeight: '100vh',
      background: `
        radial-gradient(circle at 50% 0%,   rgba(139,92,246,0.38) 0%, transparent 38%),
        radial-gradient(circle at 12% 55%,  rgba(59,130,246,0.18) 0%, transparent 30%),
        radial-gradient(circle at 88% 55%,  rgba(168,85,247,0.18) 0%, transparent 30%),
        linear-gradient(180deg, #17002f 0%, #090018 100%)
      `,
      fontFamily: '"Nunito", "Inter", system-ui, sans-serif',
      overflowY: 'auto',
      padding: '52px 20px 64px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: '1100px' }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: '0' }}>
          <div style={{
            fontSize: '72px',
            display: 'inline-block',
            marginBottom: '18px',
            filter: 'drop-shadow(0 0 28px rgba(250,204,21,0.75))',
            animation: 'hubFloat 3s ease-in-out infinite',
          }}>
            🎮
          </div>

          <h1 style={{
            color: '#ffffff',
            fontSize: 'clamp(2.5rem, 6.5vw, 5rem)',
            fontWeight: 900,
            margin: '0 0 14px',
            lineHeight: 0.95,
            letterSpacing: '-1.5px',
            textShadow: '0 0 48px rgba(139,92,246,0.85), 0 3px 10px rgba(0,0,0,0.6)',
          }}>
            Daniel's Game World
          </h1>

          <p style={{
            color: '#c4b5fd',
            fontSize: 'clamp(1.05rem, 2.2vw, 1.4rem)',
            fontWeight: 600,
            margin: '0 0 30px',
          }}>
            Welcome back, Daniel! Which world should we jump into today? ✨
          </p>

          {/* Stats strip */}
          <div style={{
            display: 'inline-flex',
            gap: '24px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '40px',
            padding: '11px 30px',
            fontSize: '14px',
            fontWeight: 700,
            color: '#e2d9f3',
            marginBottom: '56px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            <span>⭐ Total Score: 0</span>
            <span style={{ color: 'rgba(255,255,255,0.18)' }}>|</span>
            <span>💎 Gems: 0</span>
            <span style={{ color: 'rgba(255,255,255,0.18)' }}>|</span>
            <span>🚀 Best Wave: 1</span>
          </div>
        </div>

        {/* ── Game Grid ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '24px',
        }}>
          {GAMES.map((game, i) => (
            <GameCard
              key={game.id}
              game={game}
              index={i}
              onClick={() => setCurrentGame(game.id as GameId)}
            />
          ))}
          <GameCard game={MYSTERY_CARD as any} index={5} onClick={() => {}} />
        </div>

        <p style={{
          color: '#6b21a8',
          marginTop: '60px',
          fontSize: '15px',
          textAlign: 'center',
          fontWeight: 600,
        }}>
          Made with ❤️ especially for Daniel Vanteko
        </p>
      </div>
    </div>
  );
}

type AnyGame = typeof GAMES[0] & { disabled?: boolean; badge?: string };

function GameCard({ game, index, onClick }: { game: AnyGame; index: number; onClick: () => void }) {
  const [hovered, setHovered] = React.useState(false);
  const disabled = !!(game as any).disabled;

  return (
    <div
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => { if (!disabled) setHovered(true); }}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: game.gradient,
        borderRadius: '24px',
        padding: '28px',
        cursor: disabled ? 'default' : 'pointer',
        position: 'relative',
        overflow: 'hidden',
        border: `1px solid ${hovered ? game.borderActive : 'rgba(255,255,255,0.18)'}`,
        transform: hovered ? 'translateY(-8px) scale(1.015)' : 'translateY(0) scale(1)',
        boxShadow: hovered
          ? `0 24px 60px rgba(0,0,0,0.4), 0 0 32px ${game.glowColor}`
          : '0 4px 20px rgba(0,0,0,0.25)',
        transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
        opacity: disabled ? 0.72 : 1,
        animation: `hubSlideUp 420ms ease both`,
        animationDelay: `${index * 80}ms`,
        minHeight: '268px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Surprise badge */}
      {(game as any).badge && (
        <div style={{
          position: 'absolute', top: '16px', right: '16px',
          background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
          color: '#000', padding: '5px 13px', borderRadius: '20px',
          fontSize: '11px', fontWeight: 900, letterSpacing: '0.5px',
          animation: 'hubBounce 2s ease-in-out infinite',
          whiteSpace: 'nowrap',
        }}>
          {(game as any).badge}
        </div>
      )}

      <div>
        {/* Icon */}
        <div style={{
          fontSize: '56px',
          marginBottom: '14px',
          display: 'inline-block',
          transform: hovered ? 'scale(1.14) rotate(-6deg)' : 'scale(1) rotate(0deg)',
          transition: 'transform 180ms ease',
          filter: hovered ? 'drop-shadow(0 6px 14px rgba(0,0,0,0.45))' : 'none',
          lineHeight: 1,
        }}>
          {game.icon}
        </div>

        <h2 style={{
          color: '#ffffff',
          fontSize: '1.45rem',
          fontWeight: 900,
          margin: '0 0 10px',
          lineHeight: 1.15,
        }}>
          {game.title}
        </h2>

        <p style={{
          color: 'rgba(255,255,255,0.88)',
          fontSize: '0.97rem',
          margin: '0 0 20px',
          lineHeight: 1.58,
          fontWeight: 500,
        }}>
          {game.description}
        </p>
      </div>

      <div>
        {/* Stat strip */}
        {game.stat ? (
          <div style={{
            color: 'rgba(255,255,255,0.72)',
            fontSize: '13px',
            fontWeight: 700,
            marginBottom: '16px',
            padding: '6px 13px',
            background: 'rgba(0,0,0,0.22)',
            borderRadius: '8px',
            display: 'inline-block',
          }}>
            {game.stat}
          </div>
        ) : (
          <div style={{ marginBottom: '16px', height: '29px' }} />
        )}

        {/* CTA button */}
        <button
          disabled={disabled}
          style={{
            display: 'block',
            width: '100%',
            height: '52px',
            borderRadius: '16px',
            fontWeight: 800,
            letterSpacing: '0.04em',
            fontSize: '15px',
            background: hovered ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.16)',
            border: '2px solid rgba(255,255,255,0.45)',
            color: '#ffffff',
            cursor: disabled ? 'default' : 'pointer',
            transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
            transition: 'all 180ms ease',
            fontFamily: 'inherit',
            outline: 'none',
          }}
        >
          {disabled ? 'COMING SOON' : 'PLAY NOW →'}
        </button>
      </div>
    </div>
  );
}
