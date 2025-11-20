
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, RowType, RowData, Obstacle, Skin, Decoration } from './types';
import { GAME_CONFIG, INITIAL_SKINS } from './constants';
import { PlayerAsset, TreeAsset, CarAsset, LogAsset, CoinAsset, FlowerAsset, RockAsset, LilypadAsset, SplatAsset, SplashAsset, CoinCollectEffect } from './components/Assets';
import { Shop } from './components/Shop';
import { Gamble } from './components/Gamble';
import { initAudio, playJump, playCoin, playCrash, playSplash, playCashout, playClick, toggleMute, isMuted } from './utils/audio';

// --- Helper: Random Utils ---
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

function App() {
  // -- State --
  const [gameState, setGameState] = useState<GameState>(GameState.INTRO);
  // New: Track which mode is actually being played to show correct Game Over screen
  const [activeGameMode, setActiveGameMode] = useState<GameState | null>(null);
  const [deathReason, setDeathReason] = useState<'CAR' | 'WATER' | 'BOUNDS' | null>(null);

  const [coins, setCoins] = useState<number>(() => parseInt(localStorage.getItem('cc_coins') || '100'));
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('cc_highscore') || '0'));
  
  // Effects State
  const [coinEffects, setCoinEffects] = useState<{id: number, x: number, y: number}[]>([]);
  const [muted, setMuted] = useState(false);
  
  // Gamble Mode State
  const [gambleBet, setGambleBet] = useState(0);
  const [gambleMultiplier, setGambleMultiplier] = useState(1.0);
  
  // End Game State
  const [gameResult, setGameResult] = useState<'DIED' | 'CASHOUT' | null>(null);
  const [hasConverted, setHasConverted] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const [skins, setSkins] = useState<Skin[]>(() => {
    const saved = localStorage.getItem('cc_skins');
    return saved ? JSON.parse(saved) : INITIAL_SKINS;
  });
  const [equippedSkinId, setEquippedSkinId] = useState(() => localStorage.getItem('cc_equipped') || 'chicken_default');

  // -- Game Ref State --
  const gameRef = useRef({
    player: { gridX: Math.floor(GAME_CONFIG.COLUMNS / 2), gridY: 0, skinId: 'chicken_default' },
    rows: [] as RowData[],
    isJumping: false,
    jumpDirection: 'up' as 'up'|'down'|'left'|'right',
    lastTime: 0,
    cameraY: 0,
    gameOver: false,
    rowIdCounter: 0,
    currentScore: 0, // Sync score tracking for logic
    highScore: parseInt(localStorage.getItem('cc_highscore') || '0')
  });

  const requestRef = useRef<number>(0);
  const gameStateRef = useRef(gameState);
  // Ref to track gamble state for input handler without re-binding
  const gambleRef = useRef({ bet: 0, multiplier: 1.0 });
  const [renderTrigger, setRenderTrigger] = useState(0); // Forces re-render for React updates

  // -- Persistence --
  useEffect(() => {
    localStorage.setItem('cc_coins', coins.toString());
    localStorage.setItem('cc_skins', JSON.stringify(skins));
    localStorage.setItem('cc_equipped', equippedSkinId);
    localStorage.setItem('cc_highscore', highScore.toString());
  }, [coins, skins, equippedSkinId, highScore]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Sync gamble state to ref
  useEffect(() => {
    gambleRef.current = { bet: gambleBet, multiplier: gambleMultiplier };
  }, [gambleBet, gambleMultiplier]);

  // --- Intro Timer ---
  useEffect(() => {
    if (gameState === GameState.INTRO) {
      const timer = setTimeout(() => {
        setGameState(GameState.MENU);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  // --- Row Generation ---
  const generateRow = (yIndex: number, difficulty: number): RowData => {
    gameRef.current.rowIdCounter++;
    const id = gameRef.current.rowIdCounter;
    
    // Safe Zone at start
    if (yIndex < 4) return { id, type: RowType.GRASS, obstacles: [], decorations: [] };

    const typeRoll = Math.random();
    let type = RowType.GRASS;
    
    const waterProb = Math.min(0.2 + (difficulty * 0.005), 0.35);
    const roadProb = Math.min(0.3 + (difficulty * 0.005), 0.55);

    if (typeRoll < waterProb) type = RowType.WATER;
    else if (typeRoll < waterProb + roadProb) type = RowType.ROAD;

    const obstacles: Obstacle[] = [];
    const decorations: Decoration[] = [];
    const direction = Math.random() > 0.5 ? 1 : -1;
    
    // Pixel Art moves slightly slower for cleaner look
    const baseSpeed = 0.03; 
    const speed = baseSpeed + (Math.min(difficulty, 100) * 0.0008);

    const occupiedX = new Set<number>();

    if (type === RowType.GRASS) {
      // Trees
      const treeCount = randInt(0, 3); 
      for (let i = 0; i < treeCount; i++) {
        let x = randInt(0, GAME_CONFIG.COLUMNS - 1);
        if (!occupiedX.has(x)) {
          occupiedX.add(x);
          obstacles.push({ id: Math.random(), x, speed: 0, type: 'TREE', width: 1, direction: 1 });
        }
      }
      // Coins
      if (Math.random() > 0.9) {
          let x = randInt(0, GAME_CONFIG.COLUMNS - 1);
          if(!occupiedX.has(x)) {
               occupiedX.add(x);
               obstacles.push({ id: Math.random(), x, speed: 0, type: 'TREE', width: 0, direction: 1, skin: 'COIN' }); 
          }
      }
      // Decorations
      const decoCount = randInt(0, 3);
      for (let i = 0; i < decoCount; i++) {
         let x = randInt(0, GAME_CONFIG.COLUMNS - 1);
         if (!occupiedX.has(x)) {
            decorations.push({ id: Math.random(), x, type: Math.random() > 0.5 ? 'ROCK' : 'FLOWER', variant: randInt(0, 3) });
         }
      }

    } else if (type === RowType.ROAD) {
      const carCount = randInt(1, 2);
      // Ensure enough space between cars
      const spacing = GAME_CONFIG.COLUMNS / carCount;
      for(let i=0; i<carCount; i++) {
         const xOffset = (i * spacing) + randInt(0, 1); 
         obstacles.push({
           id: Math.random(),
           x: xOffset % GAME_CONFIG.COLUMNS, 
           speed: speed * randInt(8, 12) * 0.1,
           type: 'CAR', width: 2, direction // Cars are wider in pixel art (2 blocks ish visually)
         });
      }
    } else if (type === RowType.WATER) {
      const logCount = randInt(2, 3);
      const spacing = GAME_CONFIG.COLUMNS / logCount;
      for(let i=0; i<logCount; i++) {
         const xOffset = (i * spacing) + randInt(0, 1);
         obstacles.push({
           id: Math.random(),
           x: xOffset % GAME_CONFIG.COLUMNS,
           speed: speed * 0.8, 
           type: 'LOG', 
           width: randInt(2, 3), 
           direction
         });
      }
      // Lilypads
      if (Math.random() > 0.5) decorations.push({ id: Math.random(), x: randInt(0, GAME_CONFIG.COLUMNS), type: 'LILYPAD' });
    }

    return { id, type, obstacles, decorations, laneSpeed: speed, direction };
  };

  // --- Input Handling ---
  const handleInput = useCallback((key: string) => {
    // CASHOUT SHORTCUT
    if (gameStateRef.current === GameState.GAMBLE_RUN && key === ' ') {
        if (gameRef.current.gameOver) return;
        playCashout(); // Audio
        const { bet, multiplier } = gambleRef.current;
        const winnings = Math.floor(bet * multiplier);
        setCoins(c => c + winnings);
        gameRef.current.gameOver = true;
        setGameResult('CASHOUT');
        setGameState(GameState.GAME_OVER);
        return;
    }

    if ((gameStateRef.current !== GameState.PLAYING && gameStateRef.current !== GameState.GAMBLE_RUN) || gameRef.current.isJumping || gameRef.current.gameOver) return;

    const { player, rows } = gameRef.current;
    let nextX = player.gridX;
    let nextY = player.gridY;
    let direction: 'up'|'down'|'left'|'right' = 'up';

    if (['ArrowUp', 'w', 'W'].includes(key)) { nextY++; direction = 'up'; }
    else if (['ArrowDown', 's', 'S'].includes(key)) { nextY--; direction = 'down'; }
    else if (['ArrowLeft', 'a', 'A'].includes(key)) { nextX--; direction = 'left'; }
    else if (['ArrowRight', 'd', 'D'].includes(key)) { nextX++; direction = 'right'; }
    else return;

    // Bound Check (X)
    if (nextX < 0 || nextX >= GAME_CONFIG.COLUMNS) return;
    // Bound Check (Y - can't go back too far)
    if (nextY < gameRef.current.cameraY) return;

    // Check Static Collision (Trees)
    const targetRow = rows.find(r => r.id === nextY);
    if (targetRow && targetRow.type === RowType.GRASS) {
      // Simple integer check for static obstacles
      const hitTree = targetRow.obstacles.find(o => Math.round(o.x) === nextX && o.type === 'TREE' && o.skin !== 'COIN');
      if (hitTree) return; 
    }

    // EXECUTE JUMP
    playJump(); // Audio
    gameRef.current.isJumping = true;
    gameRef.current.jumpDirection = direction;
    
    // Snappy animation time (120ms)
    setTimeout(() => {
        if (gameRef.current.gameOver) return;
        
        gameRef.current.player.gridX = nextX;
        gameRef.current.player.gridY = nextY;
        gameRef.current.isJumping = false;
        
        // Scoring
        if (nextY > gameRef.current.currentScore) {
            gameRef.current.currentScore = nextY;
            setScore(nextY); // Update UI
            
            if (gameStateRef.current === GameState.GAMBLE_RUN) {
                setGambleMultiplier(prev => parseFloat((prev + 0.1).toFixed(1)));
            }
        }
        
        // Camera Movement
        const targetCameraY = Math.max(0, nextY - 3);
        if (targetCameraY > gameRef.current.cameraY) {
            gameRef.current.cameraY = targetCameraY;
        }
        
        // Infinite Generation
        const highestRowId = gameRef.current.rows[gameRef.current.rows.length - 1].id;
        if (highestRowId < gameRef.current.cameraY + 18) {
            for(let i=1; i<=5; i++) {
                gameRef.current.rows.push(generateRow(highestRowId + i, highestRowId + i));
            }
            // Cleanup old rows
            if (gameRef.current.rows.length > 30) {
                gameRef.current.rows.shift();
            }
        }

        // Coin Collection
        if (targetRow) {
             const coinIndex = targetRow.obstacles.findIndex(o => Math.round(o.x) === nextX && o.skin === 'COIN');
             if (coinIndex !== -1) {
                 playCoin(); // Audio
                 targetRow.obstacles.splice(coinIndex, 1);
                 setCoins(c => c + 1);
                 // Add visual effect
                 const effectId = Math.random();
                 setCoinEffects(prev => [...prev, { id: effectId, x: nextX, y: nextY }]);
                 // Clean up effect after animation
                 setTimeout(() => {
                    setCoinEffects(prev => prev.filter(e => e.id !== effectId));
                 }, 800);
             }
        }
    }, 120);

  }, []); // Removed 'score' dependency, relying on ref

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
        if (e.key === ' ') e.preventDefault(); // Prevent scrolling
        handleInput(e.key);
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleInput]);

  // -- Game Over Logic --
  const handleGameOver = (reason: 'CAR' | 'WATER' | 'BOUNDS' = 'CAR') => {
    if (gameRef.current.gameOver) return;
    gameRef.current.gameOver = true;
    
    if (reason === 'WATER') playSplash(); else playCrash(); // Audio

    // Trigger Shake Effect
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);

    if (gameStateRef.current === GameState.PLAYING) {
        if (gameRef.current.currentScore > gameRef.current.highScore) {
             gameRef.current.highScore = gameRef.current.currentScore;
             setHighScore(gameRef.current.currentScore);
        }
    }
    setDeathReason(reason);
    setGameResult('DIED');
    setGameState(GameState.GAME_OVER);
  };

  // -- Game Loop --
  const update = useCallback((time: number) => {
    if (gameStateRef.current !== GameState.PLAYING && gameStateRef.current !== GameState.GAMBLE_RUN) return;

    const dt = time - gameRef.current.lastTime;
    gameRef.current.lastTime = time;
    const safeDt = Math.min(dt, 60); 
    const timeScale = safeDt / 16.67;

    const { player, rows } = gameRef.current;

    // Move Dynamic Obstacles
    rows.forEach(row => {
       if (row.type === RowType.ROAD || row.type === RowType.WATER) {
          const rowSpeed = (row.laneSpeed || 0.05) * timeScale;
          
          row.obstacles.forEach(obs => {
             obs.x += (obs.direction * rowSpeed);
             
             // Loop around
             const limit = GAME_CONFIG.COLUMNS + 2;
             if (obs.direction === 1 && obs.x > limit) obs.x = -obs.width - 1;
             if (obs.direction === -1 && obs.x < -obs.width - 1) obs.x = limit;
          });
       }
    });

    // Check Dynamic Collision (Player vs Cars/Water)
    if (!gameRef.current.isJumping && !gameRef.current.gameOver) {
        const currentRow = rows.find(r => r.id === player.gridY);
        if (currentRow) {
            // LOG LOGIC
            if (currentRow.type === RowType.WATER) {
                let onLog = false;
                currentRow.obstacles.forEach(log => {
                    // Forgiving hitbox for logs
                    if (player.gridX >= log.x - 0.6 && player.gridX <= log.x + log.width - 0.4) {
                        onLog = true;
                        // Carry player
                        player.gridX += (log.direction * (currentRow.laneSpeed || 0.05) * timeScale);
                    }
                });
                if (!onLog) handleGameOver('WATER');
            }
            
            // CAR LOGIC
            if (currentRow.type === RowType.ROAD) {
                currentRow.obstacles.forEach(car => {
                   // Precise hitbox for cars
                   const carCenter = car.x + (car.width/2);
                   const playerCenter = player.gridX + 0.5;
                   const dist = Math.abs(carCenter - playerCenter);
                   
                   // Slightly forgiving car hitbox (0.9 range instead of 1.0)
                   if (dist < (car.width * 0.45)) { 
                       handleGameOver('CAR');
                   }
                });
            }

            // OUT OF BOUNDS
            if (player.gridX < -0.5 || player.gridX > GAME_CONFIG.COLUMNS - 0.5) {
                handleGameOver('BOUNDS');
            }
        }
    }

    setRenderTrigger(time); // Force React render
    requestRef.current = requestAnimationFrame(update);
  }, []);

  const handleCashout = () => {
      if (gameState !== GameState.GAMBLE_RUN) return;
      playCashout(); // Audio
      const winnings = Math.floor(gambleBet * gambleMultiplier);
      setCoins(c => c + winnings);
      gameRef.current.gameOver = true;
      setGameResult('CASHOUT');
      setGameState(GameState.GAME_OVER); 
  };

  const startGame = (mode: GameState, bet = 0) => {
    // Reset
    gameRef.current.rowIdCounter = -1;
    const initialRows = [];
    for (let i = 0; i < GAME_CONFIG.INITIAL_ROWS; i++) initialRows.push(generateRow(i, 0));
    
    gameRef.current = {
      player: { gridX: Math.floor(GAME_CONFIG.COLUMNS / 2), gridY: 0, skinId: equippedSkinId },
      rows: initialRows,
      isJumping: false,
      jumpDirection: 'up',
      lastTime: performance.now(),
      cameraY: 0,
      gameOver: false,
      rowIdCounter: initialRows[initialRows.length-1].id,
      currentScore: 0,
      highScore: gameRef.current.highScore
    };

    setScore(0);
    setGameResult(null);
    setDeathReason(null);
    setHasConverted(false);
    setGambleBet(bet);
    setGambleMultiplier(1.0);
    setIsShaking(false);
    setCoinEffects([]); // Reset effects
    if (bet > 0) setCoins(c => c - bet);

    setActiveGameMode(mode); 
    setGameState(mode);
  };

  const convertScore = () => {
    if (hasConverted || score <= 0) return;
    playCashout(); // Audio
    setCoins(c => c + score);
    setHasConverted(true);
  };

  const toggleAudio = () => {
      setMuted(toggleMute());
  }

  // Loop lifecycle
  useEffect(() => {
    if (gameState === GameState.PLAYING || gameState === GameState.GAMBLE_RUN) {
        gameRef.current.lastTime = performance.now();
        gameRef.current.gameOver = false;
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        requestRef.current = requestAnimationFrame(update);
    }
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, update]);


  // --- Rendering ---
  const VISIBLE_ROWS = 16;
  const renderRows = gameRef.current.rows.filter(r => r.id >= gameRef.current.cameraY - 1 && r.id < gameRef.current.cameraY + VISIBLE_ROWS);
  const activeSkin = skins.find(s => s.id === equippedSkinId) || INITIAL_SKINS[0];

  return (
    <div className="w-full h-screen bg-[#202028] relative overflow-hidden select-none font-pixel text-slate-100">
      
      {/* Scanline Overlay */}
      <div className="crt-overlay" />
      
      {/* Mute Button - Always Visible */}
      <button 
        onClick={toggleAudio}
        className="absolute top-4 right-4 z-[90] w-10 h-10 bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-white hover:bg-slate-700"
      >
        {muted ? '🔇' : '🔊'}
      </button>

      {/* HUD - High Z-Index to sit on top. Only visible in active play modes or Game Over context */}
      {(gameState === GameState.PLAYING || gameState === GameState.GAMBLE_RUN || gameState === GameState.GAME_OVER) && (
      <div className="absolute top-0 left-0 w-full p-4 z-[60] pointer-events-none flex justify-between items-start font-retro">
        <div className="flex flex-col gap-2">
            {gameState === GameState.GAMBLE_RUN ? (
                 <div className="bg-black/80 border-2 border-red-500 px-4 py-2 shadow-lg">
                    <div className="text-xs text-red-400 mb-1">MULTIPLIER</div>
                    <div className="text-3xl text-white">{gambleMultiplier.toFixed(1)}x</div>
                 </div>
            ) : (
                <div className="bg-black/60 border-2 border-white px-4 py-2 shadow-lg">
                    <div className="text-xs text-gray-400 mb-1">STEPS</div>
                    <div className="text-3xl text-white">{score}</div>
                    <div className="text-xs text-blue-400 mt-1">HI: {highScore}</div>
                </div>
            )}
        </div>

        <div className="flex flex-col items-end gap-2 pointer-events-auto mt-12 md:mt-0">
            <div className="bg-black/60 border-2 border-yellow-500 px-4 py-2 flex items-center gap-2">
                <div className="text-yellow-500 text-xl">$</div>
                <span className="text-2xl text-white">{coins}</span>
            </div>

            {gameState === GameState.GAMBLE_RUN && (
                <button 
                    onClick={handleCashout}
                    className="mt-2 bg-green-600 hover:bg-green-500 text-white px-4 py-3 border-b-4 border-green-800 active:border-b-0 active:translate-y-1 transition-all"
                >
                    <div className="text-xl">CASHOUT <span className="text-xs text-green-300 block md:inline font-pixel">(SPACE)</span></div>
                    <div className="text-xs text-green-200">${Math.floor(gambleBet * gambleMultiplier)}</div>
                </button>
            )}
        </div>
      </div>
      )}

      {/* Game World - Lower Z-Index */}
      <div className={`game-container w-full h-full flex justify-center items-end pb-8 relative z-10 ${isShaking ? 'animate-shake' : ''}`}>
          <div 
            className="relative transition-transform duration-100"
            style={{ 
                width: `${GAME_CONFIG.COLUMNS * GAME_CONFIG.GRID_SIZE}px`, 
                height: `${VISIBLE_ROWS * GAME_CONFIG.GRID_SIZE}px`,
            }}
          >
             {renderRows.map((row) => {
                 const visualY = (row.id - gameRef.current.cameraY); 
                 return (
                    <div key={row.id} 
                        className={`absolute left-0 w-full border-b border-black/10 overflow-hidden
                            ${row.type === RowType.GRASS ? 'pattern-grass' : ''}
                            ${row.type === RowType.ROAD ? 'pattern-road' : ''}
                            ${row.type === RowType.WATER ? 'pattern-water' : ''}
                        `}
                        style={{ 
                            bottom: `${visualY * GAME_CONFIG.GRID_SIZE}px`,
                            height: `${GAME_CONFIG.GRID_SIZE}px`,
                            zIndex: 10
                        }}
                    >
                        {/* Road Markings */}
                        {row.type === RowType.ROAD && (
                            <div className="absolute w-full top-1/2 border-t-4 border-dashed border-slate-500/50 h-0" />
                        )}
                        {/* Water Shore */}
                        {row.type === RowType.WATER && (
                            <div className="absolute top-0 w-full h-1 bg-white/30" />
                        )}

                        {/* Decorations */}
                        {row.decorations.map(deco => (
                             <div key={deco.id}
                                className="absolute bottom-0"
                                style={{
                                    left: `${deco.x * GAME_CONFIG.GRID_SIZE}px`,
                                    width: `${GAME_CONFIG.GRID_SIZE}px`,
                                    height: `${GAME_CONFIG.GRID_SIZE}px`,
                                    zIndex: 15
                                }}
                             >
                                {deco.type === 'FLOWER' && <FlowerAsset variant={deco.variant || 0} />}
                                {deco.type === 'ROCK' && <RockAsset />}
                                {deco.type === 'LILYPAD' && <LilypadAsset />}
                             </div>
                        ))}

                        {/* Obstacles */}
                        {row.obstacles.map((obs) => (
                            <div key={obs.id} 
                                className="absolute bottom-0 flex items-center justify-center" 
                                style={{ 
                                    left: `${obs.x * GAME_CONFIG.GRID_SIZE}px`,
                                    width: `${(obs.width || 1) * GAME_CONFIG.GRID_SIZE}px`,
                                    height: `${GAME_CONFIG.GRID_SIZE}px`,
                                    zIndex: 20
                                }}
                            >
                                {obs.type === 'TREE' && (obs.skin === 'COIN' ? <CoinAsset /> : <TreeAsset variant={Math.floor(obs.id * 100)} />)}
                                {obs.type === 'CAR' && <CarAsset type={Math.floor(obs.id * 100)} direction={obs.direction} />}
                                {obs.type === 'LOG' && <LogAsset width={obs.width} />}
                            </div>
                        ))}
                    </div>
                 );
             })}

             {/* Visual Effects Layer */}
             {coinEffects.map(effect => (
                <div key={effect.id} 
                    className="absolute pointer-events-none z-40"
                    style={{
                        left: `${effect.x * GAME_CONFIG.GRID_SIZE}px`,
                        bottom: `${(effect.y - gameRef.current.cameraY) * GAME_CONFIG.GRID_SIZE}px`,
                        width: `${GAME_CONFIG.GRID_SIZE}px`,
                        height: `${GAME_CONFIG.GRID_SIZE}px`,
                    }}
                >
                    <CoinCollectEffect />
                </div>
             ))}

             {/* Player - Mid Z-Index */}
             <div 
                className="absolute transition-none pointer-events-none"
                style={{
                    bottom: `${(gameRef.current.player.gridY - gameRef.current.cameraY) * GAME_CONFIG.GRID_SIZE}px`,
                    left: `${gameRef.current.player.gridX * GAME_CONFIG.GRID_SIZE}px`,
                    width: `${GAME_CONFIG.GRID_SIZE}px`,
                    height: `${GAME_CONFIG.GRID_SIZE}px`,
                    zIndex: 30
                }}
             >
                 {/* Hide player body if drowned (Splash replaces it) */}
                 {deathReason !== 'WATER' && (
                     <PlayerAsset 
                        skin={activeSkin} 
                        isJumping={gameRef.current.isJumping} 
                        direction={gameRef.current.jumpDirection}
                        isDead={gameRef.current.gameOver} 
                     />
                 )}
                 
                 {/* Death Effects */}
                 {gameRef.current.gameOver && gameResult === 'DIED' && (
                     <div className="absolute inset-0 -z-10 scale-125 opacity-90">
                         {deathReason === 'WATER' ? <SplashAsset /> : <SplatAsset />}
                     </div>
                 )}
             </div>
          </div>
      </div>

      {/* --- Menus (Highest Z-Index) --- */}
      
      {/* INTRO SEQUENCE */}
      {gameState === GameState.INTRO && (
        <div 
            className="absolute inset-0 z-[100] bg-[#1a1a20] flex flex-col items-center justify-center cursor-pointer overflow-hidden" 
            onClick={() => { 
                initAudio(); 
                setGameState(GameState.MENU); 
            }}
        >
            <div className="absolute top-1/4 flex flex-col items-center gap-2">
                <h2 className="text-gray-500 font-pixel text-xl tracking-widest animate-pulse">PRESENTING</h2>
                <h1 className="text-6xl md:text-8xl text-yellow-400 font-retro text-shadow-outline animate-pop-in" style={{ animationDelay: '0.5s' }}>CROSSY</h1>
                <h1 className="text-6xl md:text-8xl text-white font-retro text-shadow-outline animate-pop-in" style={{ animationDelay: '1s' }}>CHICKEN</h1>
                <h3 className="text-xl text-blue-300 font-retro mt-4 animate-pulse" style={{ animationDelay: '1.5s' }}>8-BIT EDITION</h3>
            </div>
            
            {/* Running Chicken Animation */}
            <div className="absolute bottom-1/4 left-0 w-full">
                <div className="w-16 h-16 animate-slide-across">
                     <div className="animate-bounce-pixel w-full h-full">
                        <PlayerAsset skin={INITIAL_SKINS[0]} isJumping={false} direction="right" />
                     </div>
                </div>
            </div>
        </div>
      )}

      {gameState === GameState.MENU && (
        <div className="absolute inset-0 z-[70] bg-black/70 flex flex-col items-center justify-center p-4 text-center">
           <div className="animate-float-pixel mb-8">
              <h1 className="text-6xl font-retro text-yellow-400 text-shadow-outline mb-2">CROSSY</h1>
              <h1 className="text-6xl font-retro text-white text-shadow-outline">8-BIT</h1>
           </div>
           
           <div className="w-full max-w-xs space-y-4">
              <button onClick={() => { playClick(); startGame(GameState.PLAYING); }} className="w-full btn-retro bg-green-500 text-white py-4 text-2xl font-bold border-2 border-black hover:bg-green-400">
                PLAY GAME
              </button>
              
              <div className="flex gap-4">
                <button onClick={() => { playClick(); setGameState(GameState.SHOP); }} className="flex-1 btn-retro bg-purple-500 text-white py-4 text-xl font-bold border-2 border-black hover:bg-purple-400">
                  SHOP
                </button>
                <button onClick={() => { playClick(); setGameState(GameState.GAMBLE_MENU); }} className="flex-1 btn-retro bg-red-500 text-white py-4 text-xl font-bold border-2 border-black hover:bg-red-400">
                  STAKES
                </button>
              </div>
           </div>
        </div>
      )}

      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 z-[80] bg-black/80 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-slate-800 border-4 border-slate-950 p-1 w-full max-w-md relative shadow-2xl scale-105">
                {/* Decorative screws */}
                <div className="absolute -top-2 -left-2 w-4 h-4 bg-gray-400 border-2 border-black" />
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-gray-400 border-2 border-black" />
                <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-gray-400 border-2 border-black" />
                <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-gray-400 border-2 border-black" />

                <div className="border-4 border-slate-900 bg-[#202028] p-6 flex flex-col items-center gap-6">
                    
                    <div className="scale-150 image-pixelated p-4 bg-slate-900/50 rounded-full border-2 border-slate-700">
                        <div className="w-16 h-16">
                           <PlayerAsset skin={activeSkin} isJumping={false} direction="down" isDead={gameResult === 'DIED'} />
                        </div>
                    </div>

                    {/* RESULTS */}
                    {activeGameMode === GameState.GAMBLE_RUN ? (
                         gameResult === 'DIED' ? (
                             <div className="text-center">
                                 <h2 className="text-6xl font-retro text-red-500 text-shadow-outline tracking-tighter animate-bounce-pixel mb-2">BUSTED</h2>
                                 <div className="bg-black/40 p-2 border border-red-900/50">
                                     <p className="text-gray-400 font-pixel text-xl">YOU LOST THE BET</p>
                                     <p className="text-red-500 font-retro text-2xl line-through decoration-2 decoration-white/30">${gambleBet}</p>
                                 </div>
                             </div>
                         ) : (
                             <div className="text-center">
                                <h2 className="text-5xl font-retro text-green-400 text-shadow-outline mb-2">WINNER</h2>
                                <div className="bg-black/40 p-2 border border-green-900/50">
                                    <p className="text-gray-400 font-pixel text-xl">PROFIT MADE</p>
                                    <p className="text-yellow-400 font-retro text-3xl text-shadow-retro">+${Math.floor(gambleBet * gambleMultiplier) - gambleBet}</p>
                                </div>
                             </div>
                         )
                    ) : (
                         // NORMAL MODE
                         <>
                            <div className="text-center">
                                <h2 className="text-5xl font-retro text-white text-shadow-outline mb-2">GAME OVER</h2>
                                <div className="flex items-center justify-center gap-6 text-yellow-400 text-shadow-retro mt-2 bg-black/30 p-3 rounded border border-white/10">
                                     <div className="flex flex-col">
                                        <span className="text-xs text-gray-400 font-bold">SCORE</span>
                                        <span className="text-4xl text-white">{score}</span>
                                     </div>
                                     <div className="w-px h-10 bg-white/20" />
                                     <div className="flex flex-col">
                                        <span className="text-xs text-gray-400 font-bold">BEST</span>
                                        <span className="text-4xl text-blue-300">{highScore}</span>
                                     </div>
                                </div>
                            </div>
                            
                            {/* REWARD SECTION - Only for Normal Mode */}
                             <div className="w-full bg-black/40 p-1 border-2 border-slate-700">
                                 {hasConverted ? (
                                     <div className="text-center bg-green-900/30 text-green-400 font-bold text-xl flex items-center justify-center gap-2 py-3">
                                         <span>✓ ${score} ADDED TO WALLET</span>
                                     </div>
                                 ) : (
                                     <button 
                                        onClick={convertScore}
                                        disabled={score === 0}
                                        className={`w-full py-3 shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] font-bold text-xl flex items-center justify-center gap-3 transition-all active:translate-y-1 active:shadow-none ${
                                            score > 0 ? 'bg-yellow-500 hover:bg-yellow-400 text-black border-2 border-black animate-pulse' : 'bg-gray-700 text-gray-500 cursor-not-allowed border-2 border-gray-600'
                                        }`}
                                     >
                                         <span>CONVERT SCORE</span>
                                         {score > 0 && (
                                             <div className="flex items-center bg-black/20 px-2 rounded text-sm">
                                                 <span className="mr-1">+</span>
                                                 <span className="text-yellow-100">${score}</span>
                                             </div>
                                         )}
                                     </button>
                                 )}
                             </div>
                         </>
                    )}

                    {/* BUTTONS */}
                    <div className="flex gap-3 w-full mt-2">
                        <button onClick={() => { playClick(); setGameState(GameState.MENU); }} className="flex-1 py-3 bg-slate-600 text-white font-bold border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] hover:bg-slate-500 active:translate-y-1 active:shadow-none">
                            MENU
                        </button>
                        <button 
                            onClick={() => { playClick(); startGame(activeGameMode === GameState.GAMBLE_RUN ? GameState.GAMBLE_MENU : GameState.PLAYING); }}
                            className="flex-1 py-3 bg-green-600 text-white font-bold border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] hover:bg-green-500 active:translate-y-1 active:shadow-none"
                        >
                            {activeGameMode === GameState.GAMBLE_RUN ? 'BET AGAIN' : 'RETRY'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {gameState === GameState.SHOP && (
        <Shop 
          coins={coins} 
          skins={skins} 
          currentSkinId={equippedSkinId} 
          onClose={() => { playClick(); setGameState(GameState.MENU); }}
          onBuy={(id) => {
             const skin = skins.find(s => s.id === id);
             if(skin && coins >= skin.price) {
               playCashout(); // Satisfying sound for purchase
               setCoins(c => c - skin.price);
               setSkins(curr => curr.map(s => s.id === id ? {...s, owned: true} : s));
             }
          }}
          onEquip={(id) => { playClick(); setEquippedSkinId(id); }}
        />
      )}

      {gameState === GameState.GAMBLE_MENU && (
        <Gamble 
          coins={coins} 
          onStartGamble={(bet) => { playClick(); startGame(GameState.GAMBLE_RUN, bet); }}
          onClose={() => { playClick(); setGameState(GameState.MENU); }} 
        />
      )}

      {/* Mobile Controls */}
      <div className="absolute bottom-8 left-0 w-full flex justify-center gap-4 z-[60] md:hidden pointer-events-none">
         <div className="pointer-events-auto grid grid-cols-3 gap-3">
            <div />
            <button className="w-16 h-16 bg-white/10 border-2 border-white/30 rounded active:bg-white/30 text-3xl" onTouchStart={(e) => { e.preventDefault(); handleInput('ArrowUp'); }}>⬆️</button>
            <div />
            <button className="w-16 h-16 bg-white/10 border-2 border-white/30 rounded active:bg-white/30 text-3xl" onTouchStart={(e) => { e.preventDefault(); handleInput('ArrowLeft'); }}>⬅️</button>
            <button className="w-16 h-16 bg-white/10 border-2 border-white/30 rounded active:bg-white/30 text-3xl" onTouchStart={(e) => { e.preventDefault(); handleInput('ArrowDown'); }}>⬇️</button>
            <button className="w-16 h-16 bg-white/10 border-2 border-white/30 rounded active:bg-white/30 text-3xl" onTouchStart={(e) => { e.preventDefault(); handleInput('ArrowRight'); }}>➡️</button>
         </div>
      </div>
    </div>
  );
}

export default App;
