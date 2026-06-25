import React, { useState } from 'react';
import MinecraftGame from './games/minecraft/MinecraftGame';
import DiamondRush from './games/diamondRush/DiamondRush';
import SpaceDefender from './games/spaceDefender/SpaceDefender';
import RacingGame from './games/racing/RacingGame';
import Platformer from './games/platformer/Platformer';

type GameId = 'minecraft' | 'diamond-rush' | 'space-defender' | 'racing' | 'platformer' | null;

const GAMES = [
  {
    id: 'minecraft' as GameId,
    title: "Daniel's Minecraft",
    description: 'Mine blocks, build worlds! YOU are the hero!',
    emoji: '⛏️',
    bg: 'linear-gradient(135deg, #2d5a27, #4caf50)',
    border: '#4caf50',
    surprise: true,
  },
  {
    id: 'diamond-rush' as GameId,
    title: 'Diamond Rush',
    description: 'Collect diamonds, dodge boulders — the classic adventure!',
    emoji: '💎',
    bg: 'linear-gradient(135deg, #1a237e, #3f51b5)',
    border: '#7986cb',
  },
  {
    id: 'space-defender' as GameId,
    title: 'Space Defender',
    description: "Daniel's spaceship blasts aliens across the galaxy!",
    emoji: '🚀',
    bg: 'linear-gradient(135deg, #4a148c, #9c27b0)',
    border: '#ce93d8',
  },
  {
    id: 'racing' as GameId,
    title: 'Road Racer',
    description: 'Speed down the highway and dodge all the traffic!',
    emoji: '🏎️',
    bg: 'linear-gradient(135deg, #b71c1c, #f44336)',
    border: '#ef9a9a',
  },
  {
    id: 'platformer' as GameId,
    title: 'Super Daniel Run',
    description: 'Jump, stomp enemies and collect stars in this epic run!',
    emoji: '⭐',
    bg: 'linear-gradient(135deg, #e65100, #ff9800)',
    border: '#ffcc80',
  },
];

export default function App() {
  const [currentGame, setCurrentGame] = useState<GameId>(null);

  const back = () => setCurrentGame(null);

  if (currentGame === 'minecraft') return <MinecraftGame onBack={back} />;
  if (currentGame === 'diamond-rush') return <DiamondRush onBack={back} />;
  if (currentGame === 'space-defender') return <SpaceDefender onBack={back} />;
  if (currentGame === 'racing') return <RacingGame onBack={back} />;
  if (currentGame === 'platformer') return <Platformer onBack={back} />;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0221, #1a0533, #0d1b4b)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px',
      fontFamily: '"Segoe UI", Arial, sans-serif',
    }}>
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '1000px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <div style={{ fontSize: '72px', marginBottom: '12px', filter: 'drop-shadow(0 0 20px rgba(255,200,0,0.8))' }}>🎮</div>
          <h1 style={{
            color: 'white',
            fontSize: 'clamp(32px, 6vw, 56px)',
            fontWeight: 900,
            margin: 0,
            letterSpacing: '-1px',
            textShadow: '0 0 40px rgba(147,112,219,0.9), 0 2px 4px rgba(0,0,0,0.5)',
          }}>
            Daniel's Game World
          </h1>
          <p style={{
            color: '#b39ddb',
            fontSize: 'clamp(16px, 3vw, 22px)',
            marginTop: '12px',
            fontWeight: 500,
          }}>
            Welcome, Daniel Vanteko! Choose your adventure 🌟
          </p>
        </div>

        {/* Games Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '24px',
        }}>
          {GAMES.map(game => (
            <GameCard key={game.id} game={game} onClick={() => setCurrentGame(game.id)} />
          ))}
        </div>

        <p style={{ color: '#6b5b95', marginTop: '50px', fontSize: '14px', textAlign: 'center' }}>
          Made with ❤️ especially for Daniel Vanteko
        </p>
      </div>
    </div>
  );
}

function GameCard({ game, onClick }: { game: typeof GAMES[0]; onClick: () => void }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: game.bg,
        borderRadius: '20px',
        padding: '28px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        border: `2px solid ${hovered ? game.border : 'rgba(255,255,255,0.1)'}`,
        transform: hovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
        boxShadow: hovered
          ? `0 24px 48px rgba(0,0,0,0.5), 0 0 30px ${game.border}55`
          : '0 4px 20px rgba(0,0,0,0.3)',
        transition: 'all 0.25s ease',
      }}
    >
      {game.surprise && (
        <div style={{
          position: 'absolute', top: '14px', right: '14px',
          background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
          color: '#000', padding: '4px 12px', borderRadius: '20px',
          fontSize: '11px', fontWeight: 900, letterSpacing: '1px',
        }}>
          🎁 SURPRISE!
        </div>
      )}
      <div style={{
        fontSize: '52px', marginBottom: '16px', display: 'inline-block',
        transform: hovered ? 'scale(1.15) rotate(-5deg)' : 'scale(1)',
        transition: 'transform 0.25s ease',
      }}>
        {game.emoji}
      </div>
      <h2 style={{ color: 'white', fontSize: '22px', fontWeight: 800, margin: '0 0 10px 0' }}>
        {game.title}
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '15px', margin: '0 0 24px 0', lineHeight: 1.6 }}>
        {game.description}
      </p>
      <button style={{
        background: hovered ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.2)',
        border: '2px solid rgba(255,255,255,0.5)',
        color: 'white', padding: '11px 28px', borderRadius: '12px',
        fontSize: '15px', fontWeight: 700, cursor: 'pointer',
      }}>
        PLAY NOW →
      </button>
    </div>
  );
}
