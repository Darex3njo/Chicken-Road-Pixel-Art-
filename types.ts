
export enum GameState {
  INTRO = 'INTRO',
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  SHOP = 'SHOP',
  GAMBLE_MENU = 'GAMBLE_MENU', // Selecting bet
  GAMBLE_RUN = 'GAMBLE_RUN',   // Playing for multiplier
}

export enum RowType {
  GRASS = 'GRASS',
  ROAD = 'ROAD',
  WATER = 'WATER',
}

export interface Decoration {
  id: number;
  x: number;
  type: 'FLOWER' | 'ROCK' | 'LILYPAD' | 'GRASS_TUFTS';
  variant?: number; // For visual variety
}

export interface Obstacle {
  id: number;
  x: number;
  speed: number;
  type: 'CAR' | 'LOG' | 'TREE';
  width: number;
  direction: 1 | -1;
  skin?: string; // Specific visual variant
}

export interface RowData {
  id: number;
  type: RowType;
  obstacles: Obstacle[];
  decorations: Decoration[];
  laneSpeed?: number; // For roads/water
  direction?: 1 | -1;
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