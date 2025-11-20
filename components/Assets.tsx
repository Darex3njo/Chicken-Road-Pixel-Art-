
import React from 'react';
import { Skin } from '../types';

// --- Pixel Art Engine ---
interface PixelGraphicProps {
  map: string[];
  palette: Record<string, string>;
  scale?: number;
}

const PixelGraphic: React.FC<PixelGraphicProps> = ({ map, palette, scale = 1 }) => {
  const pixelSize = 4; // Base pixel size
  const width = map[0].length * pixelSize;
  const height = map.length * pixelSize;

  return (
    <svg 
      viewBox={`0 0 ${width} ${height}`} 
      width="100%" 
      height="100%" 
      style={{ shapeRendering: 'crispEdges' }} 
    >
      {map.flatMap((row, y) => 
        row.split('').map((char, x) => {
          if (char === '.' || !palette[char]) return null;
          return (
            <rect
              key={`${x}-${y}`}
              x={x * pixelSize}
              y={y * pixelSize}
              width={pixelSize}
              height={pixelSize}
              fill={palette[char]}
            />
          );
        })
      )}
    </svg>
  );
};

// --- Player Asset ---

interface PlayerAssetProps {
  skin: Skin;
  isJumping: boolean;
  direction: 'up' | 'down' | 'left' | 'right';
  isDead?: boolean;
}

export const PlayerAsset: React.FC<PlayerAssetProps> = ({ skin, isJumping, direction, isDead }) => {
  // 10x10 Pixel Grid for Chicken
  const sideMap = [
    "....xxxx..",
    "....xrrx..",
    "..xxxssxxx",
    "..xssssssx",
    "xxxssssssx",
    "xssssssssx",
    "xssssssssx",
    "xxxxsssxxx",
    "...xoox...",
    "...xoox..."
  ];
  
  const frontMap = [
    "...xxxx...",
    "...xrrx...",
    "..xxssxx..",
    ".xssssssx.",
    ".xswsswsx.",
    ".xssssssx.",
    ".xssssssx.",
    "..xxssxx..",
    "...xoox...",
    "...xoox..."
  ];

  const backMap = [
    "...xxxx...",
    "...xrrx...",
    "..xxssxx..",
    ".xssssssx.",
    ".xssssssx.",
    ".xssssssx.",
    ".xssssssx.",
    "..xxssxx..",
    "...xoox...",
    "...xoox..."
  ];

  const deadMap = [
      "..........",
      "..........",
      "...xxxx...",
      "..xrrxx...",
      ".xxssxx...",
      ".xssssx...",
      ".xxssxx...",
      "...xx.....",
      "..........",
      ".........."
  ];

  let activeMap = sideMap;
  let flip = false;
  
  if (isDead) {
      activeMap = deadMap;
  } else {
    if (direction === 'up') activeMap = backMap;
    else if (direction === 'down') activeMap = frontMap;
    else if (direction === 'right') { activeMap = sideMap; flip = true; } 
    else if (direction === 'left') activeMap = sideMap;
  }

  // --- Complex Palette Logic ---
  const getPalette = (colorId: string) => {
      const colors: any = {
          '.': 'none', 'x': '#1a1a1a', 'w': '#ffffff', 
          'r': '#ef4444', // Comb
          'o': '#f97316', // Beak/Legs
          's': '#ffffff'  // Body
      };
      
      // Overrides based on skin ID/Color
      switch(colorId) {
          case 'blue': colors.s = '#60a5fa'; break;
          case 'red': colors.s = '#f87171'; break;
          case 'mint': colors.s = '#6ee7b7'; break;
          case 'lemon': colors.s = '#fef08a'; break;
          case 'grape': colors.s = '#a855f7'; break;
          case 'banana': colors.s = '#facc15'; colors.r = '#854d0e'; break;
          case 'tangerine': colors.s = '#fb923c'; colors.r = '#16a34a'; break; // Orange body, green stem comb
          
          case 'dark': colors.s = '#334155'; colors.r = '#475569'; break;
          case 'punk': colors.s = '#d1d5db'; colors.r = '#ec4899'; break; // Pink mohawk (comb)
          case 'business': colors.s = '#f8fafc'; colors.x = '#0f172a'; break; // Suit-ish feel via outline
          case 'camo': colors.s = '#4d7c0f'; colors.r = '#3f6212'; break;
          case 'cow': colors.s = '#ffffff'; colors.r = '#000000'; break; 
          case 'detective': colors.s = '#a8a29e'; colors.r = '#78350f'; break; // Brownish coat
          case 'farmer': colors.s = '#2563eb'; colors.r = '#dc2626'; break; // Blue overalls

          case 'zombie': colors.s = '#65a30d'; colors.r = '#3f6212'; colors.w = '#fca5a5'; break; // Green skin, dark comb
          case 'vampire': colors.s = '#e2e8f0'; colors.x = '#450a0a'; colors.r = '#991b1b'; break; // Pale skin, dark red cloak outline
          case 'robo': colors.s = '#94a3b8'; colors.r = '#3b82f6'; colors.o = '#64748b'; break; // Metal, blue eye
          case 'diver': colors.s = '#f97316'; colors.r = '#fdba74'; colors.w = '#3b82f6'; break; // Orange suit, blue mask
          case 'prisoner': colors.s = '#cbd5e1'; colors.x = '#1e293b'; break;
          case 'cop': colors.s = '#1e3a8a'; colors.r = '#facc15'; break; // Blue uniform, gold badge
          case 'chef': colors.s = '#f9fafb'; colors.r = '#dc2626'; break; // White coat

          case 'ninja': colors.s = '#171717'; colors.r = '#dc2626'; break; 
          case 'king': colors.s = '#fcd34d'; colors.r = '#b45309'; break; // Gold body
          case 'wizard': colors.s = '#8b5cf6'; colors.r = '#4c1d95'; break; // Purple robe body
          case 'knight': colors.s = '#94a3b8'; colors.r = '#dc2626'; colors.o = '#475569'; break; // Silver/Grey
          case 'santa': colors.s = '#ef4444'; colors.r = '#ffffff'; break; // Red body, white comb (hat trim)
          case 'viking': colors.s = '#9ca3af'; colors.r = '#d97706'; break; // Grey armour
          case 'pharaoh': colors.s = '#d97706'; colors.r = '#2563eb'; break; // Gold and Blue

          case 'alien': colors.s = '#a3e635'; colors.x = '#1a2e05'; colors.w = '#000000'; break; // Neon green, black eyes
          case 'void': colors.s = '#09090b'; colors.x = '#7c3aed'; colors.r = '#a855f7'; break; // Dark with purple aura
          case 'gold': colors.s = '#fbbf24'; colors.x = '#b45309'; colors.r = '#f59e0b'; colors.o = '#fcd34d'; break; // Solid Gold
          case 'cyber': colors.s = '#22d3ee'; colors.x = '#c026d3'; colors.r = '#e879f9'; break; // Neon Cyan/Pink
          case 'ghost': colors.s = '#e0f2fe'; colors.x = '#bae6fd'; colors.o = '#cbd5e1'; break; // Very light blue, faint outline
          case 'galaxy': colors.s = '#312e81'; colors.r = '#818cf8'; colors.x = '#c7d2fe'; break; // Deep Indigo
          case 'glitch': colors.s = '#22c55e'; colors.x = '#000000'; colors.r = '#16a34a'; break; // Matrix Green
      }
      return colors;
  };

  // --- Accessories / Overlays ---
  // Simple pixel overlays that render on top of the chicken based on ID
  const getAccessories = () => {
      if (isDead) return null;
      if (skin.id === 'chicken_king') {
          // Crown
          return (
            <div className="absolute top-[-6px] left-1/2 -translate-x-1/2 w-6 h-4">
                <PixelGraphic 
                    map={["..y.y..", ".yyyyy.", "yyyyyyy"]} 
                    palette={{'.':'none', 'y':'#facc15'}} 
                />
            </div>
          )
      }
      if (skin.id === 'chicken_wizard') {
          // Wizard Hat
          return (
            <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 w-6 h-6">
                 <PixelGraphic 
                    map={["...b...", "..bbb..", ".bbbbb.", "bbbbbbb"]} 
                    palette={{'.':'none', 'b':'#4c1d95'}} 
                />
            </div>
          )
      }
      if (skin.id === 'chicken_santa') {
          // Santa Hat
          return (
             <div className="absolute top-[-6px] left-1/2 -translate-x-1/2 w-6 h-4">
                 <PixelGraphic 
                    map={["...r...", "..rrr..", ".rrrrr.", "wwwwwww"]} 
                    palette={{'.':'none', 'r':'#dc2626', 'w': '#ffffff'}} 
                />
             </div>
          )
      }
      if (skin.id === 'chicken_viking') {
          // Viking Helmet
          return (
             <div className="absolute top-[-6px] left-1/2 -translate-x-1/2 w-6 h-4">
                 <PixelGraphic 
                    map={["w.....w", "w.sss.w", ".sssss.", "sssssss"]} 
                    palette={{'.':'none', 's':'#9ca3af', 'w': '#fef3c7'}} 
                />
             </div>
          )
      }
      if (skin.id === 'chicken_chef') {
          // Chef Hat
          return (
             <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 w-6 h-6">
                 <PixelGraphic 
                    map={["..www..", ".wwwww.", ".wwwww.", ".wwwww.", "wwwwwww"]} 
                    palette={{'.':'none', 'w':'#ffffff'}} 
                />
             </div>
          )
      }
      if (skin.id === 'chicken_cop') {
          // Police Hat
          return (
             <div className="absolute top-[-6px] left-1/2 -translate-x-1/2 w-6 h-4">
                 <PixelGraphic 
                    map={[".......", ".bbbbb.", "bbbybbb", "bbbbbbb"]} 
                    palette={{'.':'none', 'b':'#1e3a8a', 'y': '#facc15'}} 
                />
             </div>
          )
      }
      if (skin.id === 'chicken_sherlock') {
          // Detective Hat
          return (
             <div className="absolute top-[-6px] left-1/2 -translate-x-1/2 w-6 h-4">
                 <PixelGraphic 
                    map={[".......", "..bbb..", ".bbbbb.", "bbbbbbb"]} 
                    palette={{'.':'none', 'b':'#78350f'}} 
                />
             </div>
          )
      }
      return null;
  };

  return (
    <div 
        className={`w-full h-full relative transition-transform duration-75 ${isJumping ? 'scale-125 -translate-y-4' : ''}`}
        style={{ transform: `${flip ? 'scaleX(-1)' : ''} ${isJumping ? 'translateY(-10px) scale(1.1)' : ''} ${isDead ? 'rotate-90 translate-y-2 opacity-80' : ''}` }}
    >
       {/* Glow for Mythics */}
       {skin.tier === 'MYTHIC' && !isDead && (
           <div className="absolute inset-0 rounded-full animate-mythic-glow opacity-80" style={{ transform: 'scale(0.8)' }}></div>
       )}

       <PixelGraphic map={activeMap} palette={getPalette(skin.color)} />
       {getAccessories()}
       
       {/* Particle effects for Mythics */}
       {skin.tier === 'MYTHIC' && !isDead && (
           <div className="absolute inset-0 pointer-events-none overflow-visible">
               {/* Rising Particles */}
               <div className="absolute top-full left-1/4 w-1 h-1 bg-purple-400 rounded-full animate-particle-rise" style={{ animationDuration: '2s' }}></div>
               <div className="absolute top-full left-3/4 w-1 h-1 bg-pink-400 rounded-full animate-particle-rise" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}></div>
               <div className="absolute top-full left-1/2 w-1 h-1 bg-blue-300 rounded-full animate-particle-rise" style={{ animationDuration: '1.8s', animationDelay: '1s' }}></div>
               
               {/* Random sparkles */}
               <div className="absolute -top-2 left-0 w-1 h-1 bg-white animate-ping" style={{ animationDuration: '3s', opacity: 0.5 }}></div>
               <div className="absolute bottom-2 -right-2 w-1 h-1 bg-yellow-300 animate-ping" style={{ animationDuration: '4s', opacity: 0.5 }}></div>
           </div>
       )}
    </div>
  );
};

export const SplatAsset = () => {
    const map = [
        "..........",
        "..xx..xx..",
        ".xxxxxxxx.",
        ".xxxxxxxx.",
        "..xxxxxx..",
        "...xxxx...",
        "..........",
    ];
    return (
        <div className="w-full h-full opacity-80">
             <PixelGraphic map={map} palette={{ '.': 'none', 'x': '#dc2626' }} />
        </div>
    )
}

// --- Car Asset ---
export const CarAsset = ({ type, direction }: { type: number, direction: number }) => {
  // High-res map (22px wide) to match "2-block" width density
  const map = [
    "....xxxxxxxxxxxxxx....",
    "..xxssssssssssssssxx..",
    ".xsssswwwwwwwwwwssssx.",
    ".xssswwwwwwwwwwwwsssx.",
    "xsssswwwwwwwwwwwwssssx",
    "xssssssssssssssssssssx",
    "xxxxxxxxxxxxxxxxxxxxxx",
    ".xox..xox....xox..xox.", // Wheels
    ".xxx..xxx....xxx..xxx."
  ];

  const palette: any = { '.': 'none', 'x': '#0f172a', 'w': '#bfdbfe', 'o': '#334155' };
  const colors = ['#ef4444', '#3b82f6', '#eab308', '#a855f7'];
  palette.s = colors[type % colors.length];

  return (
    <div className="w-full h-full p-1" style={{ transform: direction === -1 ? 'scaleX(-1)' : 'none' }}>
        <PixelGraphic map={map} palette={palette} />
    </div>
  );
};

// --- Tree Asset ---
export const TreeAsset = ({ variant = 1 }: { variant?: number }) => {
  const map = [
      "....xxxx....",
      "...xxggxx...",
      "..xxggggxx..",
      ".xxggggggxx.",
      ".xxggggggxx.",
      "..xxggggxx..",
      "...xxggxx...",
      "....xbbx....",
      "....xbbx....",
      "....xxxx...."
  ];
  
  // Variant 2: Pine
  const pineMap = [
      ".....xx.....",
      "....xggx....",
      "...xxggxx...",
      "..xxggggxx..",
      ".xxggggggxx.",
      "....xbbx....",
      "....xbbx....",
      "....xxxx...."
  ];

  const palette = { 
      '.': 'none', 'x': '#052e16', 
      'g': variant % 2 === 0 ? '#16a34a' : '#22c55e', // Varied greens
      'b': '#78350f' 
  };

  return (
    <div className="w-full h-full -mt-4 transform scale-110">
        <PixelGraphic map={variant % 3 === 0 ? pineMap : map} palette={palette} />
    </div>
  );
};

// --- Log Asset ---
export const LogAsset = ({ width }: { width: number }) => {
    const map = [
        ".xxxxxxxxxxxx.",
        "xbbbbbbbbbbbbx",
        "xbbbbbbbbbbbbx",
        "xbbbbbbbbbbbbx",
        ".xxxxxxxxxxxx."
    ];
    return (
        <div className="w-full h-full py-3">
            <PixelGraphic map={map} palette={{ '.': 'none', 'x': '#271306', 'b': '#78350f' }} />
        </div>
    );
};

// --- Coin Asset ---
export const CoinAsset = () => {
    const map = [
        "..xxx..",
        ".xyyyx.",
        "xyysyx.",
        "xyysyx.",
        "xyysyx.",
        ".xyyyx.",
        "..xxx.."
    ];
    return (
        <div className="w-full h-full p-2 animate-bounce-pixel">
            <PixelGraphic map={map} palette={{ '.': 'none', 'x': '#854d0e', 'y': '#facc15', 's': '#fde047' }} />
        </div>
    );
};

// --- Decorations ---
export const FlowerAsset = ({ variant }: { variant: number }) => {
    const colors = ['#f472b6', '#c084fc', '#60a5fa'];
    const c = colors[variant % colors.length];
    const map = [
        ".....",
        ".xcx.",
        "xcwcx",
        ".xcx.",
        "..g..",
        "..g.."
    ];
    return (
        <div className="w-full h-full flex items-end justify-center pb-2">
            <div className="w-6 h-6">
                 <PixelGraphic map={map} palette={{ '.': 'none', 'x': c, 'c': c, 'w': '#fff', 'g': '#16a34a' }} />
            </div>
        </div>
    );
}

export const RockAsset = () => {
    const map = [
        ".....",
        "..xx.",
        ".xggx",
        "xgggx",
        "xxxxx"
    ];
    return (
        <div className="w-full h-full flex items-end justify-center pb-2 opacity-80">
            <div className="w-8 h-8">
                <PixelGraphic map={map} palette={{ '.': 'none', 'x': '#475569', 'g': '#94a3b8' }} />
            </div>
        </div>
    );
}

export const LilypadAsset = () => {
    const map = [
        ".xxxxx.",
        "xgggggx",
        "xggggg.",
        "xgggggx",
        ".xxxxx."
    ];
    return (
        <div className="w-full h-full flex items-center justify-center opacity-90">
            <div className="w-8 h-6">
                <PixelGraphic map={map} palette={{ '.': 'none', 'x': '#14532d', 'g': '#22c55e' }} />
            </div>
        </div>
    );
}

export const SplashAsset = () => {
    const map = [
        "..........",
        "..........",
        "..ww..ww..",
        ".wwwwwwww.",
        ".wwwwwwww.",
        "..wwwwww..",
        "...wwww...",
    ];
    return (
        <div className="w-full h-full opacity-90">
             <PixelGraphic map={map} palette={{ '.': 'none', 'w': '#3b82f6' }} />
        </div>
    )
}

export const CoinCollectEffect = () => {
    return (
        <div className="w-full h-full flex items-center justify-center pointer-events-none">
            <div className="text-yellow-400 font-bold text-xl animate-bounce" style={{ textShadow: '2px 2px 0 #000' }}>
                +1
            </div>
        </div>
    )
}
