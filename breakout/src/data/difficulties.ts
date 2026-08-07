import type { DifficultyConfig, DifficultyId } from '../types/game'

export const DIFFICULTIES: Record<DifficultyId, DifficultyConfig> = {
  casual: {
    id: 'casual',
    name: '闲适潮汐',
    tagline: '宽板、慢球，适合热身与沉浸',
    lives: 5,
    ballSpeed: 4.2,
    paddleWidth: 128,
    powerChance: 0.38,
    scoreMult: 0.85,
    accent: '#5EEAD4',
  },
  classic: {
    id: 'classic',
    name: '经典流光',
    tagline: '平衡节奏，最接近原版体验',
    lives: 3,
    ballSpeed: 5.4,
    paddleWidth: 104,
    powerChance: 0.26,
    scoreMult: 1,
    accent: '#FBBF24',
  },
  hardcore: {
    id: 'hardcore',
    name: '深渊脉冲',
    tagline: '窄板、高速，容错极低',
    lives: 2,
    ballSpeed: 6.8,
    paddleWidth: 84,
    powerChance: 0.16,
    scoreMult: 1.45,
    accent: '#FB7185',
  },
  chaos: {
    id: 'chaos',
    name: '混沌棱镜',
    tagline: '道具狂潮、速度乱舞，纯属乐子',
    lives: 4,
    ballSpeed: 5.8,
    paddleWidth: 110,
    powerChance: 0.55,
    scoreMult: 1.15,
    accent: '#A3E635',
  },
}

export const DIFFICULTY_LIST = Object.values(DIFFICULTIES)
