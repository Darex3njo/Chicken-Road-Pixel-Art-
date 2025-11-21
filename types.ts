
export enum GameState {
  INTRO = 'INTRO',
  MENU = 'MENU',
  PLAYING = 'PLAYING', // Used for Classic, Survival, Challenge
  GAME_OVER = 'GAME_OVER',
  SHOP = 'SHOP',
  GAMBLE_MENU = 'GAMBLE_MENU', 
  GAMBLE_RUN = 'GAMBLE_RUN',
  CHALLENGE_MENU = 'CHALLENGE_MENU',
}

export type GameMode = 'CLASSIC' | 'GAMBLE' | 'SURVIVAL' | 'CHALLENGE';

export enum RowType {
  GRASS = 'GRASS',
  ROAD = 'ROAD',
  WATER = 'WATER',
  RAIL = 'RAIL',
}

export type WeatherType = 'CLEAR' | 'RAIN' | 'FOG';

export type PowerUpType = 'SHIELD' | 'TIME_SLOW' | 'MAGNET' | 'WATER_WALK' | 'DOUBLE_COINS';

export interface Decoration {
  id: number;
  x: number;
  type: 'FLOWER' | 'ROCK' | 'LILYPAD' | 'GRASS_TUFTS' | 'WARNING_LIGHT';
  variant?: number; // For visual variety
}

export interface Item {
  id: number;
  x: number;
  type: 'COIN' | 'POWERUP';
  powerUpType?: PowerUpType;
}

export interface Obstacle {
  id: number;
  x: number;
  speed: number;
  type: 'CAR' | 'LOG' | 'TREE' | 'TRAIN';
  width: number;
  direction: 1 | -1;
  skin?: string; // Specific visual variant
}

export interface RowData {
  id: number;
  type: RowType;
  obstacles: Obstacle[];
  decorations: Decoration[];
  items: Item[]; // Coins and Powerups
  laneSpeed?: number; // For roads/water
  direction?: 1 | -1;
  trainState?: {
    state: 'IDLE' | 'WARNING' | 'PASSING';
    timer: number;
  };
}

export type SkinTier = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';

export interface Skin {
  id: string;
  name: string;
  price: number;
  color: string; // Tailwind color class or hex, or specific ID for palette lookup
  tier: SkinTier;
  owned: boolean;
}

export interface PlayerState {
  gridX: number; // 0-10 (columns)
  gridY: number; // Absolute row index
  skinId: string;
}

export interface Challenge {
  id: number;
  title: string;
  description: string;
  type: 'SCORE' | 'COINS';
  target: number;
  timeLimit: number; // Seconds
  reward: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}
