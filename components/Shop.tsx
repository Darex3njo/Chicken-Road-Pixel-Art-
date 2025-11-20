
import React, { useMemo } from 'react';
import { Skin, SkinTier } from '../types';
import { PlayerAsset } from './Assets';

interface ShopProps {
  coins: number;
  skins: Skin[];
  currentSkinId: string;
  onBuy: (skinId: string) => void;
  onEquip: (skinId: string) => void;
  onClose: () => void;
}

const TIER_CONFIG: Record<SkinTier, { color: string; border: string; bg: string; badgeBg: string }> = {
    COMMON: { 
        color: 'text-gray-400', 
        border: 'border-gray-600', 
        bg: 'bg-slate-800',
        badgeBg: 'bg-gray-900'
    },
    RARE: { 
        color: 'text-sky-400', 
        border: 'border-sky-500', 
        bg: 'bg-sky-900/20',
        badgeBg: 'bg-sky-950'
    },
    EPIC: { 
        color: 'text-purple-400', 
        border: 'border-purple-500', 
        bg: 'bg-purple-900/20',
        badgeBg: 'bg-purple-950'
    },
    LEGENDARY: { 
        color: 'text-amber-400', 
        border: 'border-amber-500', 
        bg: 'bg-amber-900/20',
        badgeBg: 'bg-amber-950'
    },
    MYTHIC: { 
        color: 'text-rose-500', 
        border: 'border-rose-500', 
        bg: 'bg-rose-900/20',
        badgeBg: 'bg-rose-950'
    },
};

export const Shop: React.FC<ShopProps> = ({ coins, skins, currentSkinId, onBuy, onEquip, onClose }) => {
  
  const sortedSkins = useMemo(() => {
      return [...skins].sort((a, b) => a.price - b.price);
  }, [skins]);

  return (
    <div className="absolute inset-0 bg-[#202028] z-50 flex flex-col text-white font-pixel">
      {/* Header */}
      <div className="p-4 bg-slate-800 border-b-4 border-black flex justify-between items-center shadow-lg z-10">
        <div>
            <h1 className="text-4xl text-yellow-400 font-retro text-shadow-outline leading-none">ITEM SHOP</h1>
            <div className="text-gray-400 text-sm">UNLOCK NEW LOOKS</div>
        </div>
        <div className="flex items-center space-x-4">
           <div className="bg-black px-4 py-2 border-2 border-slate-600 flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-sm animate-pulse" />
              <span className="text-2xl tracking-widest text-yellow-100">${coins.toLocaleString()}</span>
           </div>
           <button onClick={onClose} className="btn-retro bg-red-500 border-2 border-black px-4 py-2 text-xl hover:bg-red-400 text-white font-bold">
             EXIT
           </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-20">
          {sortedSkins.map((skin) => {
            const isEquipped = skin.id === currentSkinId;
            const canAfford = coins >= skin.price;
            const tierStyle = TIER_CONFIG[skin.tier];
            const isMythic = skin.tier === 'MYTHIC';

            return (
              <div 
                key={skin.id}
                className={`
                  relative p-4 flex flex-col items-center border-4 transition-transform hover:scale-[1.02]
                  ${tierStyle.border} ${tierStyle.bg}
                  ${isEquipped ? 'ring-4 ring-green-500 ring-offset-2 ring-offset-slate-900' : ''}
                  shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]
                  ${isMythic ? 'animate-mythic-glow' : ''}
                `}
              >
                {/* Tier Badge */}
                <div className={`absolute top-0 left-0 px-2 py-1 border-b-2 border-r-2 ${tierStyle.border} ${tierStyle.badgeBg}`}>
                    <span className={`text-[10px] font-bold tracking-wider ${tierStyle.color}`}>
                        {skin.tier}
                    </span>
                </div>

                <div className="w-20 h-20 mb-2 mt-6 relative image-pixelated">
                   <PlayerAsset skin={skin} isJumping={false} direction="down" />
                </div>

                <h3 className={`text-xl mb-1 text-shadow-retro truncate w-full text-center ${tierStyle.color}`}>{skin.name}</h3>
                
                <div className="w-full mt-auto pt-2">
                  {skin.owned ? (
                    <button
                      onClick={() => onEquip(skin.id)}
                      disabled={isEquipped}
                      className={`w-full py-2 text-lg border-2 border-black btn-retro ${
                        isEquipped 
                          ? 'bg-green-600 text-green-100' 
                          : 'bg-slate-600 text-white hover:bg-slate-500'
                      }`}
                    >
                      {isEquipped ? 'EQUIPPED' : 'EQUIP'}
                    </button>
                  ) : (
                    <button
                      onClick={() => onBuy(skin.id)}
                      disabled={!canAfford}
                      className={`w-full py-2 text-lg border-2 border-black btn-retro flex items-center justify-center gap-1 ${
                        canAfford 
                          ? 'bg-yellow-500 text-black hover:bg-yellow-400' 
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                       <span>${skin.price.toLocaleString()}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
