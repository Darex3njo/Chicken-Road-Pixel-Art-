
import { Skin, Challenge } from './types';

export const GAME_CONFIG = {
  GRID_SIZE: 48, // Scaled for pixel art (16x3)
  COLUMNS: 13, 
  INITIAL_ROWS: 20,
  GAME_SPEED: 10,
};

export const CHALLENGES: Challenge[] = [
  {
    id: 1,
    title: 'SPRINT TRAINING',
    description: 'Reach 50 Steps in 45 Seconds',
    type: 'SCORE',
    target: 50,
    timeLimit: 45,
    reward: 50,
    difficulty: 'EASY'
  },
  {
    id: 2,
    title: 'COIN RUSH',
    description: 'Collect 10 Coins in 60 Seconds',
    type: 'COINS',
    target: 10,
    timeLimit: 60,
    reward: 100,
    difficulty: 'EASY'
  },
  {
    id: 3,
    title: 'SPEED DEMON',
    description: 'Reach 100 Steps in 60 Seconds',
    type: 'SCORE',
    target: 100,
    timeLimit: 60,
    reward: 200,
    difficulty: 'MEDIUM'
  },
  {
    id: 4,
    title: 'TREASURE HUNT',
    description: 'Collect 25 Coins without dying',
    type: 'COINS',
    target: 25,
    timeLimit: 120,
    reward: 500,
    difficulty: 'HARD'
  }
];

export const INITIAL_SKINS: Skin[] = [
  // COMMON
  { id: 'chicken_default', name: 'Original', price: 0, color: 'default', tier: 'COMMON', owned: true },
  { id: 'chicken_blue', name: 'Blueberry', price: 500, color: 'blue', tier: 'COMMON', owned: false },
  { id: 'chicken_red', name: 'Cherry', price: 500, color: 'red', tier: 'COMMON', owned: false },
  { id: 'chicken_mint', name: 'Mint', price: 500, color: 'mint', tier: 'COMMON', owned: false },
  { id: 'chicken_lemon', name: 'Lemonade', price: 500, color: 'lemon', tier: 'COMMON', owned: false },
  { id: 'chicken_grape', name: 'Grape', price: 500, color: 'grape', tier: 'COMMON', owned: false },
  { id: 'chicken_banana', name: 'Banana', price: 500, color: 'banana', tier: 'COMMON', owned: false },
  { id: 'chicken_tangerine', name: 'Tangerine', price: 500, color: 'tangerine', tier: 'COMMON', owned: false },

  // RARE
  { id: 'chicken_dark', name: 'Shadow', price: 2500, color: 'dark', tier: 'RARE', owned: false },
  { id: 'chicken_punk', name: 'Punk', price: 3500, color: 'punk', tier: 'RARE', owned: false },
  { id: 'chicken_business', name: 'Corporate', price: 4500, color: 'business', tier: 'RARE', owned: false },
  { id: 'chicken_camo', name: 'Commando', price: 3000, color: 'camo', tier: 'RARE', owned: false },
  { id: 'chicken_cow', name: 'Moo-Moo', price: 4000, color: 'cow', tier: 'RARE', owned: false },
  { id: 'chicken_sherlock', name: 'Sherlock', price: 3500, color: 'detective', tier: 'RARE', owned: false },
  { id: 'chicken_farmer', name: 'Farmer', price: 3000, color: 'farmer', tier: 'RARE', owned: false },
  
  // EPIC
  { id: 'chicken_zombie', name: 'Undead', price: 10000, color: 'zombie', tier: 'EPIC', owned: false },
  { id: 'chicken_vampire', name: 'Count Cluck', price: 12000, color: 'vampire', tier: 'EPIC', owned: false },
  { id: 'chicken_robo', name: 'Mecha-01', price: 15000, color: 'robo', tier: 'EPIC', owned: false },
  { id: 'chicken_diver', name: 'Scuba Cluck', price: 13500, color: 'diver', tier: 'EPIC', owned: false },
  { id: 'chicken_prisoner', name: 'Jailbird', price: 11000, color: 'prisoner', tier: 'EPIC', owned: false },
  { id: 'chicken_cop', name: 'Officer', price: 12000, color: 'cop', tier: 'EPIC', owned: false },
  { id: 'chicken_chef', name: 'Chef', price: 11000, color: 'chef', tier: 'EPIC', owned: false },
  
  // LEGENDARY
  { id: 'chicken_ninja', name: 'Shinobi', price: 35000, color: 'ninja', tier: 'LEGENDARY', owned: false },
  { id: 'chicken_king', name: 'The King', price: 50000, color: 'king', tier: 'LEGENDARY', owned: false },
  { id: 'chicken_wizard', name: 'Ganduck', price: 65000, color: 'wizard', tier: 'LEGENDARY', owned: false },
  { id: 'chicken_knight', name: 'Sir Clucks-a-Lot', price: 45000, color: 'knight', tier: 'LEGENDARY', owned: false },
  { id: 'chicken_santa', name: 'Festive', price: 55000, color: 'santa', tier: 'LEGENDARY', owned: false },
  { id: 'chicken_viking', name: 'Valhalla', price: 45000, color: 'viking', tier: 'LEGENDARY', owned: false },
  { id: 'chicken_pharaoh', name: 'Pharaoh', price: 60000, color: 'pharaoh', tier: 'LEGENDARY', owned: false },

  // MYTHIC
  { id: 'chicken_alien', name: 'Invader', price: 120000, color: 'alien', tier: 'MYTHIC', owned: false },
  { id: 'chicken_void', name: 'The Void', price: 250000, color: 'void', tier: 'MYTHIC', owned: false },
  { id: 'chicken_gold', name: 'Midas Touch', price: 1000000, color: 'gold', tier: 'MYTHIC', owned: false },
  { id: 'chicken_cyber', name: 'Cyberpunk', price: 150000, color: 'cyber', tier: 'MYTHIC', owned: false },
  { id: 'chicken_ghost', name: 'Poltergeist', price: 300000, color: 'ghost', tier: 'MYTHIC', owned: false },
  { id: 'chicken_cosmic', name: 'Cosmic', price: 150000, color: 'galaxy', tier: 'MYTHIC', owned: false },
  { id: 'chicken_glitch', name: 'MissingNo', price: 200000, color: 'glitch', tier: 'MYTHIC', owned: false },
];
