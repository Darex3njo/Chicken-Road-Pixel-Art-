
import React, { useState } from 'react';

interface GambleProps {
  coins: number;
  onStartGamble: (betAmount: number) => void;
  onClose: () => void;
}

export const Gamble: React.FC<GambleProps> = ({ coins, onStartGamble, onClose }) => {
  const [bet, setBet] = useState<number>(Math.min(50, coins));

  return (
    <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-4 font-pixel">
      <div className="bg-[#2a2a35] border-4 border-red-600 p-6 w-full max-w-md shadow-[8px_8px_0_0_rgba(0,0,0,0.8)] relative">
        
        {/* Decorative corner lights */}
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-yellow-500 animate-pulse" />
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-500 animate-pulse delay-75" />
        <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-yellow-500 animate-pulse delay-150" />
        <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-yellow-500 animate-pulse delay-300" />

        <h2 className="text-4xl text-center text-red-500 font-retro mb-6 text-shadow-outline tracking-tighter">
          HIGH STAKES
        </h2>

        <div className="bg-black border-2 border-slate-600 p-4 mb-6 text-green-400 text-xl font-mono leading-relaxed">
           <p>> BET COINS</p>
           <p>> RUN FAR</p>
           <p>> CASHOUT OR CRASH</p>
        </div>

        <div className="flex flex-col items-center gap-4 mb-8">
            <div className="text-slate-400 text-lg">WALLET: <span className="text-yellow-400">${coins}</span></div>
            
            <div className="flex items-center gap-4 w-full">
                <button onClick={() => setBet(Math.max(10, bet - 10))} className="w-12 h-12 bg-slate-700 border-b-4 border-slate-900 text-2xl font-bold active:translate-y-1 active:border-b-0">-</button>
                <div className="flex-1 bg-black border-2 border-slate-600 h-12 flex items-center justify-center text-3xl font-bold overflow-hidden">
                   <span className={coins > bet ? "text-green-400 animate-ready-pulse" : "text-white"}>
                     {bet}
                   </span>
                </div>
                <button onClick={() => setBet(Math.min(coins, bet + 10))} className="w-12 h-12 bg-slate-700 border-b-4 border-slate-900 text-2xl font-bold active:translate-y-1 active:border-b-0">+</button>
            </div>
            
            <div className="flex gap-2 w-full justify-center">
               {[10, 50, 100].map(b => (
                   <button key={b} onClick={() => setBet(Math.min(coins, b))} className="px-2 py-1 bg-slate-800 text-slate-300 text-sm border border-slate-600 hover:bg-slate-700">{b}</button>
               ))}
               <button onClick={() => setBet(coins)} className="px-2 py-1 bg-red-900 text-red-300 text-sm border border-red-800 hover:bg-red-800">ALL IN</button>
            </div>
        </div>

        <div className="flex gap-4">
            <button onClick={onClose} className="flex-1 bg-slate-600 border-b-4 border-slate-800 text-white py-3 text-2xl font-bold active:border-b-0 active:translate-y-1">
               BACK
            </button>
            <button 
                onClick={() => { if(bet > 0 && coins >= bet) onStartGamble(bet); }}
                disabled={coins < 10 || bet > coins}
                className={`flex-[2] border-b-4 py-3 text-2xl font-bold active:border-b-0 active:translate-y-1 transition-all ${
                    coins < 10 || bet > coins
                        ? 'bg-gray-700 border-gray-900 text-gray-500' 
                        : 'bg-red-600 border-red-800 text-yellow-400 animate-pulse-glow hover:bg-red-500'
                }`}
            >
               RISK IT
            </button>
        </div>

      </div>
    </div>
  );
};
