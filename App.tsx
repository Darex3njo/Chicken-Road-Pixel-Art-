import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, RowType, RowData, Obstacle, Skin, Decoration, Item, PowerUpType, WeatherType, GameMode, Challenge } from './types';
import { GAME_CONFIG, INITIAL_SKINS, CHALLENGES } from './constants';
import { PlayerAsset, TreeAsset, CarAsset, LogAsset, CoinAsset, FlowerAsset, RockAsset, LilypadAsset, SplatAsset, SplashAsset, CoinCollectEffect, PowerUpAsset, TrainAsset, WarningLightAsset, HazardWarningAsset } from './components/Assets';
import { Shop } from './components/Shop';
import { Gamble } from './components/Gamble';
import { initAudio, playJump, playCoin, playCrash, playSplash, playCashout, playClick, toggleMute, isMuted, playTimeSlow, playTrainWarning, playTrainPass } from './utils/audio';

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.INTRO);
  const [activeGameMode, setActiveGameMode] = useState<GameMode>('CLASSIC');
  const [deathReason, setDeathReason] = useState<'CAR' | 'WATER' | 'BOUNDS' | 'VOID' | 'TRAIN' | null>(null);
  const [coins, setCoins] = useState<number>(() => { try { return parseInt(localStorage.getItem('cc_coins') || '100') || 100; } catch { return 100; }});
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => { try { return parseInt(localStorage.getItem('cc_highscore') || '0') || 0; } catch { return 0; }});
  
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [challengeTimer, setChallengeTimer] = useState(0);
  const [challengeCoins, setChallengeCoins] = useState(0);
  const [coinEffects, setCoinEffects] = useState<{id: number, x: number, y: number, label?: string}[]>([]);
  
  const [muted, setMuted] = useState(false);
  const [weather, setWeather] = useState<WeatherType>('CLEAR');
  const [inventory, setInventory] = useState<PowerUpType | null>(null);
  const [activeEffect, setActiveEffect] = useState<{type: PowerUpType, timeLeft: number} | null>(null);
  
  const [storedPowerUp, setStoredPowerUp] = useState<PowerUpType | null>(() => {
      try {
        const val = localStorage.getItem('cc_stored_powerup');
        return (val && val !== 'null' && val !== 'undefined') ? val as PowerUpType : null;
      } catch { return null; }
  });

  const [gambleBet, setGambleBet] = useState(0);
  const [gambleMultiplier, setGambleMultiplier] = useState(1.0);
  const [gameResult, setGameResult] = useState<'DIED' | 'CASHOUT' | 'WIN' | null>(null);
  const [hasConverted, setHasConverted] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const [skins, setSkins] = useState<Skin[]>(() => {
    try { const saved = localStorage.getItem('cc_skins'); return saved ? JSON.parse(saved) : INITIAL_SKINS; } catch { return INITIAL_SKINS; }
  });
  const [equippedSkinId, setEquippedSkinId] = useState(() => localStorage.getItem('cc_equipped') || 'chicken_default');

  const gameRef = useRef({
    player: { gridX: Math.floor(GAME_CONFIG.COLUMNS / 2), gridY: 0, skinId: 'chicken_default' },
    rows: [] as RowData[],
    isJumping: false,
    jumpDirection: 'up' as 'up'|'down'|'left'|'right',
    lastTime: 0,
    cameraY: 0,
    autoScrollY: 0,
    gameOver: false,
    rowIdCounter: 0,
    currentScore: 0,
    highScore: 0,
    weatherTimer: 0,
  });
  
  useEffect(() => { gameRef.current.highScore = highScore; }, [highScore]);

  const requestRef = useRef<number>(0);
  const gameStateRef = useRef(gameState);
  const gambleRef = useRef({ bet: 0, multiplier: 1.0 });
  const inventoryRef = useRef<PowerUpType | null>(null); 
  const activeEffectRef = useRef<{type: PowerUpType, timeLeft: number} | null>(null);
  const gameModeRef = useRef<GameMode>('CLASSIC');
  const [renderTrigger, setRenderTrigger] = useState(0);

  useEffect(() => {
    localStorage.setItem('cc_coins', coins.toString());
    localStorage.setItem('cc_skins', JSON.stringify(skins));
    localStorage.setItem('cc_equipped', equippedSkinId);
    localStorage.setItem('cc_highscore', highScore.toString());
  }, [coins, skins, equippedSkinId, highScore]);
  
  useEffect(() => {
    if (storedPowerUp) localStorage.setItem('cc_stored_powerup', storedPowerUp);
    else localStorage.removeItem('cc_stored_powerup');
  }, [storedPowerUp]);

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { gambleRef.current = { bet: gambleBet, multiplier: gambleMultiplier }; }, [gambleBet, gambleMultiplier]);
  useEffect(() => { inventoryRef.current = inventory; }, [inventory]);
  useEffect(() => { gameModeRef.current = activeGameMode; }, [activeGameMode]);

  useEffect(() => {
    if (gameState === GameState.INTRO) {
      const timer = setTimeout(() => setGameState(GameState.MENU), 3500);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  const generateRow = (yIndex: number, difficulty: number): RowData => {
    gameRef.current.rowIdCounter++;
    const id = gameRef.current.rowIdCounter;
    
    if (yIndex < 4) return { id, type: RowType.GRASS, obstacles: [], decorations: [], items: [] };

    const typeRoll = Math.random();
    let type = RowType.GRASS;
    const difficultyFactor = Math.min(difficulty * 0.001, 0.3);
    
    const waterProb = 0.2 + difficultyFactor;
    const roadProb = 0.4 + difficultyFactor;
    const railProb = 0.1 + (difficulty * 0.0005);

    if (typeRoll < waterProb) type = RowType.WATER;
    else if (typeRoll < waterProb + roadProb) type = RowType.ROAD;
    else if (typeRoll < waterProb + roadProb + railProb) type = RowType.RAIL;

    const obstacles: Obstacle[] = [];
    const decorations: Decoration[] = [];
    const items: Item[] = [];
    const direction = Math.random() > 0.5 ? 1 : -1;
    const baseSpeed = 0.03; 
    const speed = baseSpeed * (1 + (Math.min(difficulty, 500) * 0.002));
    const occupiedX = new Set<number>();

    if (type === RowType.GRASS) {
      const treeCount = randInt(0, 3); 
      for (let i = 0; i < treeCount; i++) {
        let x = randInt(0, GAME_CONFIG.COLUMNS - 1);
        if (!occupiedX.has(x)) {
          occupiedX.add(x);
          obstacles.push({ id: Math.random(), x, speed: 0, type: 'TREE', width: 1, direction: 1 });
        }
      }
      // 3% Chance for PowerUp to balance gameplay
      if (Math.random() > 0.8) {
          let x = randInt(0, GAME_CONFIG.COLUMNS - 1);
          if(!occupiedX.has(x)) {
               occupiedX.add(x);
               if (Math.random() < 0.03) {
                   const pTypeRoll = Math.random();
                   let pType: PowerUpType = 'SHIELD';
                   if (pTypeRoll < 0.2) pType = 'SHIELD';
                   else if (pTypeRoll < 0.4) pType = 'TIME_SLOW';
                   else if (pTypeRoll < 0.6) pType = 'MAGNET';
                   else if (pTypeRoll < 0.8) pType = 'WATER_WALK';
                   else pType = 'DOUBLE_COINS';
                   items.push({ id: Math.random(), x, type: 'POWERUP', powerUpType: pType });
               } else {
                   items.push({ id: Math.random(), x, type: 'COIN' });
               }
          }
      }
      const decoCount = randInt(0, 3);
      for (let i = 0; i < decoCount; i++) {
         let x = randInt(0, GAME_CONFIG.COLUMNS - 1);
         if (!occupiedX.has(x)) {
            decorations.push({ id: Math.random(), x, type: Math.random() > 0.5 ? 'ROCK' : 'FLOWER', variant: randInt(0, 3) });
         }
      }
    } else if (type === RowType.ROAD) {
      const carCount = randInt(1, 2);
      const spacing = GAME_CONFIG.COLUMNS / carCount;
      for(let i=0; i<carCount; i++) {
         const xOffset = (i * spacing) + randInt(0, 1); 
         const vehicleRoll = Math.random();
         let subtype: Obstacle['subtype'] = 'SEDAN';
         let width = 2;
         let finalSpeed = speed;

         if (vehicleRoll < 0.1) { subtype = 'POLICE'; finalSpeed *= 1.5; }
         else if (vehicleRoll < 0.3) { subtype = 'TRUCK'; width = 3; finalSpeed *= 0.7; }
         else if (vehicleRoll < 0.5) { subtype = 'SPORT'; finalSpeed *= 1.3; }

         obstacles.push({
           id: Math.random(),
           x: xOffset % GAME_CONFIG.COLUMNS, 
           speed: finalSpeed * randInt(8, 14) * 0.1,
           type: 'CAR', subtype, width, direction 
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
           speed: speed * 0.8, type: 'LOG', width: randInt(2, 3), direction
         });
      }
      if (Math.random() > 0.5) decorations.push({ id: Math.random(), x: randInt(0, GAME_CONFIG.COLUMNS), type: 'LILYPAD' });
    } else if (type === RowType.RAIL) {
        decorations.push({ id: Math.random(), x: randInt(0, GAME_CONFIG.COLUMNS - 1), type: 'WARNING_LIGHT' });
    }

    return { 
        id, type, obstacles, decorations, items, laneSpeed: speed, direction,
        trainState: type === RowType.RAIL ? { state: 'IDLE', timer: randInt(2000, 5000) } : undefined 
    };
  };

  const handleInput = useCallback((key: string) => {
    if (gameModeRef.current === 'GAMBLE' && key === ' ') {
        if (gameRef.current.gameOver) return;
        playCashout();
        const { bet, multiplier } = gambleRef.current;
        const winnings = Math.floor(bet * multiplier);
        setCoins(c => c + winnings);
        gameRef.current.gameOver = true;
        setGameResult('CASHOUT');
        setGameState(GameState.GAME_OVER);
        return;
    }
    if ((key === 'e' || key === 'E') && inventoryRef.current) {
        const type = inventoryRef.current;
        let duration = 5000; 
        if (type === 'SHIELD') duration = 999999;
        activeEffectRef.current = { type, timeLeft: duration };
        setActiveEffect({ type, timeLeft: duration });
        setInventory(null); 
        if (type === 'TIME_SLOW') playTimeSlow(); else playCashout(); 
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

    if (nextX < 0 || nextX >= GAME_CONFIG.COLUMNS) return;
    const limitY = gameModeRef.current === 'SURVIVAL' ? gameRef.current.autoScrollY : gameRef.current.cameraY;
    if (nextY < limitY) return;

    const targetRow = rows.find(r => r.id === nextY);
    if (targetRow && targetRow.type === RowType.GRASS) {
      const hitTree = targetRow.obstacles.find(o => Math.round(o.x) === nextX && o.type === 'TREE');
      if (hitTree) return; 
    }

    playJump();
    gameRef.current.isJumping = true;
    gameRef.current.jumpDirection = direction;
    
    const jumpDuration = activeEffectRef.current?.type === 'TIME_SLOW' ? 160 : 100;

    setTimeout(() => {
        if (gameRef.current.gameOver) return;
        gameRef.current.player.gridX = nextX;
        gameRef.current.player.gridY = nextY;
        gameRef.current.isJumping = false;
        
        if (nextY > gameRef.current.currentScore) {
            gameRef.current.currentScore = nextY;
            setScore(nextY);
            if (gameModeRef.current === 'GAMBLE') setGambleMultiplier(prev => parseFloat((prev + 0.1).toFixed(1)));
        }
        
        if (gameModeRef.current !== 'SURVIVAL') {
            const targetCameraY = Math.max(0, nextY - 3);
            if (targetCameraY > gameRef.current.cameraY) gameRef.current.cameraY = targetCameraY;
        }
        
        const highestRowId = gameRef.current.rows[gameRef.current.rows.length - 1].id;
        if (highestRowId < (gameModeRef.current === 'SURVIVAL' ? gameRef.current.autoScrollY : gameRef.current.cameraY) + 20) {
            for(let i=1; i<=5; i++) gameRef.current.rows.push(generateRow(highestRowId + i, highestRowId + i));
            if (gameRef.current.rows.length > 35) gameRef.current.rows.shift();
        }

        if (targetRow && targetRow.items) {
             const itemIndex = targetRow.items.findIndex(o => Math.round(o.x) === nextX);
             if (itemIndex !== -1) {
                 const item = targetRow.items[itemIndex];
                 const effectId = Math.random();
                 
                 if (item.type === 'COIN') {
                     playCoin();
                     const multiplier = activeEffectRef.current?.type === 'DOUBLE_COINS' ? 2 : 1;
                     setCoins(c => c + multiplier);
                     if (gameModeRef.current === 'CHALLENGE') setChallengeCoins(c => c + multiplier);
                     setCoinEffects(prev => [...prev, { id: effectId, x: nextX, y: nextY, label: "+1" }]);
                 } else if (item.type === 'POWERUP' && item.powerUpType) {
                     playCashout(); 
                     setInventory(item.powerUpType);
                     setCoinEffects(prev => [...prev, { id: effectId, x: nextX, y: nextY, label: "+PWR" }]);
                 }
                 setTimeout(() => setCoinEffects(prev => prev.filter(e => e.id !== effectId)), 800);
                 targetRow.items.splice(itemIndex, 1);
             }
        }
    }, jumpDuration);
  }, []); 

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
        if (e.key === ' ') e.preventDefault(); 
        handleInput(e.key);
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleInput]);

  const handleGameOver = (reason: 'CAR' | 'WATER' | 'BOUNDS' | 'VOID' | 'TRAIN' = 'CAR') => {
    if (gameRef.current.gameOver) return;
    if (activeEffectRef.current?.type === 'SHIELD' && reason !== 'VOID') {
        activeEffectRef.current = null;
        setActiveEffect(null);
        playCashout(); 
        if (reason === 'WATER') gameRef.current.player.gridY -= 1;
        return; 
    }
    gameRef.current.gameOver = true;
    if (reason === 'WATER') playSplash(); else playCrash(); 
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    if (gameModeRef.current === 'CLASSIC' || gameModeRef.current === 'SURVIVAL') {
        if (gameRef.current.currentScore > gameRef.current.highScore) {
             gameRef.current.highScore = gameRef.current.currentScore;
             setHighScore(gameRef.current.currentScore);
        }
    }
    setDeathReason(reason);
    setGameResult('DIED');
    setGameState(GameState.GAME_OVER);
  };

  const handleChallengeWin = () => {
      if (gameRef.current.gameOver) return;
      gameRef.current.gameOver = true;
      playCashout();
      if (activeChallenge) setCoins(c => c + activeChallenge.reward);
      setGameResult('WIN');
      setGameState(GameState.GAME_OVER);
  }

  const update = useCallback((time: number) => {
    if (gameStateRef.current !== GameState.PLAYING && gameStateRef.current !== GameState.GAMBLE_RUN) return;
    
    // Time Management
    let dt = time - gameRef.current.lastTime;
    gameRef.current.lastTime = time;
    // Prevent giant jumps if tab was inactive
    if (dt > 100) dt = 16; 
    const safeDt = Math.min(dt, 50); 
    let timeScale = safeDt / 16.67;

    if (gameModeRef.current === 'CHALLENGE' && activeChallenge) {
        setChallengeTimer(prev => {
            const newVal = prev - (safeDt / 1000);
            if (newVal <= 0) { handleGameOver('BOUNDS'); return 0; }
            return newVal;
        });
        if (activeChallenge.type === 'SCORE' && gameRef.current.currentScore >= activeChallenge.target) handleChallengeWin();
        else if (activeChallenge.type === 'COINS' && challengeCoins >= activeChallenge.target) handleChallengeWin();
    }

    if (gameModeRef.current === 'SURVIVAL') {
        const survivalSpeed = 0.02 + (gameRef.current.currentScore * 0.0005);
        gameRef.current.autoScrollY += (survivalSpeed * timeScale);
        gameRef.current.cameraY = Math.floor(gameRef.current.autoScrollY);
        if (gameRef.current.player.gridY < gameRef.current.autoScrollY - 0.5) handleGameOver('VOID');
    }

    gameRef.current.weatherTimer += safeDt;
    if (gameRef.current.weatherTimer > 10000) { 
        gameRef.current.weatherTimer = 0;
        const r = Math.random();
        if (r < 0.6) setWeather('CLEAR'); else if (r < 0.8) setWeather('RAIN'); else setWeather('FOG');
    }

    if (activeEffectRef.current) {
        if (activeEffectRef.current.type !== 'SHIELD') {
            activeEffectRef.current.timeLeft -= safeDt;
            if (activeEffectRef.current.timeLeft <= 0) { activeEffectRef.current = null; setActiveEffect(null); }
        }
        if (activeEffectRef.current?.type === 'TIME_SLOW') timeScale *= 0.5; 
    }

    const { player, rows } = gameRef.current;

    if (activeEffectRef.current?.type === 'MAGNET') {
        const playerY = player.gridY;
        rows.forEach(row => {
            if (Math.abs(row.id - playerY) <= 3 && row.items) {
                row.items.forEach(item => {
                    if (item.type === 'COIN') {
                         const dx = player.gridX - item.x;
                         item.x += (dx * 0.1 * timeScale);
                         if (Math.abs(item.x - player.gridX) < 0.5) {
                              item.x = -999; 
                              playCoin();
                              const multiplier = activeEffectRef.current?.type === 'DOUBLE_COINS' ? 2 : 1;
                              setCoins(c => c + multiplier);
                              if (gameModeRef.current === 'CHALLENGE') setChallengeCoins(c => c + multiplier);
                         }
                    }
                });
                row.items = row.items.filter(i => i.x !== -999);
            }
        })
    }

    rows.forEach(row => {
       if (row.type === RowType.RAIL && row.trainState) {
           row.trainState.timer -= safeDt;
           if (row.trainState.state === 'IDLE') {
               if (row.trainState.timer <= 0) {
                   row.trainState.state = 'WARNING'; row.trainState.timer = 2000; 
                   playTrainWarning();
               }
           } else if (row.trainState.state === 'WARNING') {
               if (row.trainState.timer <= 0) {
                   row.trainState.state = 'PASSING'; row.trainState.timer = 1500; 
                   playTrainPass();
                   row.obstacles = [{ id: Math.random(), x: row.direction === 1 ? -5 : GAME_CONFIG.COLUMNS + 5, speed: 0.8, type: 'TRAIN', width: 12, direction: row.direction || 1 }];
               }
           } else if (row.trainState.state === 'PASSING') {
               if (row.trainState.timer <= 0) {
                   row.trainState.state = 'IDLE'; row.trainState.timer = randInt(3000, 8000); row.obstacles = []; 
               }
           }
       }
       if (row.type === RowType.ROAD || row.type === RowType.WATER || row.type === RowType.RAIL) {
          const baseSpeed = row.laneSpeed || 0.05;
          const speed = row.type === RowType.RAIL ? 0.8 : baseSpeed;
          const moveSpeed = speed * timeScale;
          
          row.obstacles.forEach(obs => {
             obs.x += (obs.direction * moveSpeed);
             if (obs.type !== 'TRAIN') {
                 const limit = GAME_CONFIG.COLUMNS + 2;
                 if (obs.direction === 1 && obs.x > limit) obs.x = -obs.width - 1;
                 if (obs.direction === -1 && obs.x < -obs.width - 1) obs.x = limit;
             }
          });
       }
    });

    if (!gameRef.current.isJumping && !gameRef.current.gameOver) {
        const currentRow = rows.find(r => r.id === player.gridY);
        if (currentRow) {
            if (currentRow.type === RowType.WATER) {
                let safe = false;
                let onLog = false;
                currentRow.obstacles.forEach(log => {
                    if (player.gridX >= log.x - 0.6 && player.gridX <= log.x + log.width - 0.4) {
                        onLog = true;
                        player.gridX += (log.direction * (currentRow.laneSpeed || 0.05) * timeScale);
                    }
                });
                if (onLog) safe = true;
                if (activeEffectRef.current?.type === 'WATER_WALK') safe = true;
                if (!safe) handleGameOver('WATER');
            }
            if (currentRow.type === RowType.ROAD) {
                currentRow.obstacles.forEach(car => {
                   const center = car.x + (car.width/2);
                   const dist = Math.abs(center - (player.gridX + 0.5));
                   if (dist < (car.width * 0.45)) handleGameOver('CAR');
                });
            }
            if (currentRow.type === RowType.RAIL) {
                currentRow.obstacles.forEach(train => {
                    const center = train.x + (train.width/2);
                    const dist = Math.abs(center - (player.gridX + 0.5));
                    if (dist < (train.width * 0.48)) handleGameOver('TRAIN');
                })
            }
            if (player.gridX < -0.5 || player.gridX > GAME_CONFIG.COLUMNS - 0.5) handleGameOver('BOUNDS');
        }
    }
    setRenderTrigger(time); 
    requestRef.current = requestAnimationFrame(update);
  }, [activeChallenge, challengeCoins]);

  const VISIBLE_ROWS = 16;
  const renderRows = gameRef.current.rows.filter(r => r.id >= gameRef.current.cameraY - 1 && r.id < gameRef.current.cameraY + VISIBLE_ROWS);
  const activeSkin = skins.find(s => s.id === equippedSkinId) || INITIAL_SKINS[0];
  const toggleAudio = () => { const m = toggleMute(); setMuted(m); };

  const handleCashout = () => {
       if (gameRef.current.gameOver) return;
       playCashout();
       const { bet, multiplier } = gambleRef.current;
       const winnings = Math.floor(bet * multiplier);
       setCoins(c => c + winnings);
       gameRef.current.gameOver = true;
       setGameResult('CASHOUT');
       setGameState(GameState.GAME_OVER);
  };

  const convertScore = () => {
      if (hasConverted || score <= 0) return;
      playCashout(); 
      setCoins(c => c + score);
      setHasConverted(true);
  };

  const startGame = (mode: GameMode, bet = 0, challenge: Challenge | null = null) => {
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
      autoScrollY: 0,
      gameOver: false,
      rowIdCounter: initialRows[initialRows.length-1].id,
      currentScore: 0,
      highScore: gameRef.current.highScore,
      weatherTimer: 0
    };

    setScore(0);
    setGameResult(null);
    setDeathReason(null);
    setHasConverted(false);
    setGambleBet(bet);
    setGambleMultiplier(1.0);
    setIsShaking(false);
    setCoinEffects([]); 
    setInventory(storedPowerUp);
    setStoredPowerUp(null);
    setActiveEffect(null);
    activeEffectRef.current = null;
    setWeather('CLEAR');
    setActiveChallenge(challenge);
    setChallengeTimer(challenge ? challenge.timeLimit : 0);
    setChallengeCoins(0);
    if (bet > 0) setCoins(c => c - bet);
    setActiveGameMode(mode); 
    setGameState(mode === 'GAMBLE' ? GameState.GAMBLE_RUN : GameState.PLAYING);
  };

  return (
    <div className="w-full h-screen bg-[#202028] relative overflow-hidden select-none font-pixel text-slate-100">
      <div className="crt-overlay" />
      {weather === 'RAIN' && <div className="rain-layer" />}
      {weather === 'FOG' && <div className="fog-layer" />}
      {activeEffect?.type === 'TIME_SLOW' && <div className="absolute inset-0 bg-blue-900/20 pointer-events-none z-40 mix-blend-overlay" />}
      <button onClick={toggleAudio} className="absolute top-4 right-4 z-[90] w-10 h-10 bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-white hover:bg-slate-700">{muted ? '🔇' : '🔊'}</button>

      {(gameState === GameState.PLAYING || gameState === GameState.GAMBLE_RUN || gameState === GameState.GAME_OVER) && (
      <div className="absolute top-0 left-0 w-full p-4 z-[60] pointer-events-none flex justify-between items-start font-retro">
        <div className="flex flex-col gap-2">
            {activeGameMode === 'GAMBLE' ? (
                 <div className="bg-black/80 border-2 border-red-500 px-4 py-2 shadow-lg">
                    <div className="text-xs text-red-400 mb-1">MULTIPLIER</div>
                    <div className="text-3xl text-white">{gambleMultiplier.toFixed(1)}x</div>
                 </div>
            ) : activeGameMode === 'CHALLENGE' && activeChallenge ? (
                <div className="bg-black/80 border-2 border-purple-500 px-4 py-2 shadow-lg">
                    <div className="text-xs text-purple-400 mb-1">{activeChallenge.title}</div>
                    <div className="text-2xl text-white flex gap-4"><span>{activeChallenge.type === 'SCORE' ? score : challengeCoins} / {activeChallenge.target}</span><span className={challengeTimer < 10 ? 'text-red-500 animate-pulse' : 'text-white'}>{Math.ceil(challengeTimer)}s</span></div>
                </div>
            ) : (
                <div className="bg-black/60 border-2 border-white px-4 py-2 shadow-lg">
                    <div className="text-xs text-gray-400 mb-1">{activeGameMode === 'SURVIVAL' ? 'SURVIVED' : 'STEPS'}</div>
                    <div className="text-3xl text-white">{score}</div>
                    <div className="text-xs text-blue-400 mt-1">HI: {highScore}</div>
                </div>
            )}
            <div className="mt-2 pointer-events-auto">
                 <div className="bg-black/60 border-2 border-slate-500 px-2 py-2 shadow-lg flex items-center gap-2">
                     <div className="w-10 h-10 bg-slate-800 border border-slate-600 flex items-center justify-center relative drop-shadow-md">
                         {inventory ? <div key={inventory} className="w-8 h-8 animate-pop-in"><PowerUpAsset type={inventory} /></div> : <span className="text-xs text-gray-600">EMPTY</span>}
                         <div className="absolute -bottom-2 -right-2 bg-white text-black text-[10px] px-1 border border-black font-bold rounded">E</div>
                     </div>
                     <div className="flex flex-col"><span className="text-xs text-gray-400">POWER-UP</span><span className="text-sm text-white">{inventory || "NONE"}</span></div>
                 </div>
            </div>
            {activeEffectRef.current && (
                <div className="mt-2 pointer-events-auto animate-pop-in">
                     <div className="bg-black/60 border-2 border-blue-500 px-2 py-2 shadow-lg flex items-center gap-2">
                         <div className="w-10 h-10 bg-slate-800 border border-slate-600 flex items-center justify-center relative overflow-hidden">
                             <div className="w-8 h-8"><PowerUpAsset type={activeEffectRef.current.type} /></div>
                             {activeEffectRef.current.type !== 'SHIELD' && <div className="absolute bottom-0 left-0 h-1 bg-green-400 transition-all duration-75 ease-linear" style={{ width: `${Math.max(0, (activeEffectRef.current.timeLeft / 5000) * 100)}%` }} />}
                             {activeEffectRef.current.type === 'SHIELD' && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse shadow-[0_0_4px_#60a5fa]" />}
                         </div>
                         <div className="flex flex-col"><span className="text-xs text-blue-400">ACTIVE</span><span className="text-sm text-white text-shadow-outline">{activeEffectRef.current.type.replace('_', ' ')}</span></div>
                     </div>
                </div>
            )}
        </div>
        <div className="flex flex-col items-end gap-2 pointer-events-auto mt-12 md:mt-0">
            <div className="bg-black/60 border-2 border-yellow-500 px-4 py-2 flex items-center gap-2">
                <div className="text-yellow-500 text-xl">$</div>
                <span className="text-2xl text-white">{coins}</span>
            </div>
            {activeGameMode === 'GAMBLE' && <button onClick={handleCashout} className="mt-2 bg-green-600 hover:bg-green-500 text-white px-4 py-3 border-b-4 border-green-800 active:border-b-0 active:translate-y-1 transition-all"><div className="text-xl">CASHOUT <span className="text-xs text-green-300 block md:inline font-pixel">(SPACE)</span></div><div className="text-xs text-green-200">${Math.floor(gambleBet * gambleMultiplier)}</div></button>}
        </div>
      </div>
      )}

      <div className={`game-container w-full h-full flex justify-center items-end pb-8 relative z-10 ${isShaking ? 'animate-shake' : ''}`}>
          <div className="relative transition-transform duration-100" style={{ width: `${GAME_CONFIG.COLUMNS * GAME_CONFIG.GRID_SIZE}px`, height: `${VISIBLE_ROWS * GAME_CONFIG.GRID_SIZE}px` }}>
             {renderRows.map((row) => {
                 const visualY = (row.id - gameRef.current.cameraY); 
                 const showLeftWarning = row.direction === 1 && ((row.type === RowType.RAIL && row.trainState?.state === 'WARNING') || (row.type === RowType.ROAD && row.obstacles.some(o => o.x < 0 && o.x > -5)));
                 const showRightWarning = row.direction === -1 && ((row.type === RowType.RAIL && row.trainState?.state === 'WARNING') || (row.type === RowType.ROAD && row.obstacles.some(o => o.x > GAME_CONFIG.COLUMNS && o.x < GAME_CONFIG.COLUMNS + 5)));
                 return (
                    <div key={row.id} className={`absolute left-0 w-full border-b border-black/10 overflow-hidden ${row.type === RowType.GRASS ? 'pattern-grass' : ''} ${row.type === RowType.ROAD ? 'pattern-road' : ''} ${row.type === RowType.WATER ? 'pattern-water' : ''} ${row.type === RowType.RAIL ? 'pattern-rail' : ''}`} style={{ bottom: `${visualY * GAME_CONFIG.GRID_SIZE}px`, height: `${GAME_CONFIG.GRID_SIZE}px`, zIndex: 10 }}>
                        {showLeftWarning && <div className="absolute left-0 top-0 h-full w-8 z-40 flex items-center justify-center bg-gradient-to-r from-red-500/40 to-transparent"><div className="w-5 h-5"><HazardWarningAsset /></div></div>}
                        {showRightWarning && <div className="absolute right-0 top-0 h-full w-8 z-40 flex items-center justify-center bg-gradient-to-l from-red-500/40 to-transparent"><div className="w-5 h-5"><HazardWarningAsset /></div></div>}
                        {row.type === RowType.ROAD && <div className="absolute w-full top-1/2 border-t-4 border-dashed border-slate-500/50 h-0" />}
                        {row.type === RowType.WATER && <div className="absolute top-0 w-full h-1 bg-white/30" />}
                        {activeGameMode === 'SURVIVAL' && row.id < gameRef.current.autoScrollY + 1 && <div className="absolute inset-0 bg-black/50 z-30 pointer-events-none" />}
                        {row.decorations.map(deco => (
                             <div key={deco.id} className="absolute bottom-0" style={{ left: `${deco.x * GAME_CONFIG.GRID_SIZE}px`, width: `${GAME_CONFIG.GRID_SIZE}px`, height: `${GAME_CONFIG.GRID_SIZE}px`, zIndex: 15 }}>
                                {deco.type === 'FLOWER' && <FlowerAsset variant={deco.variant || 0} />}
                                {deco.type === 'ROCK' && <RockAsset />}
                                {deco.type === 'LILYPAD' && <LilypadAsset />}
                                {deco.type === 'WARNING_LIGHT' && <WarningLightAsset active={row.trainState?.state === 'WARNING'} />}
                             </div>
                        ))}
                        {row.items && row.items.map(item => (
                            <div key={item.id} className="absolute bottom-0 flex items-center justify-center" style={{ left: `${item.x * GAME_CONFIG.GRID_SIZE}px`, width: `${GAME_CONFIG.GRID_SIZE}px`, height: `${GAME_CONFIG.GRID_SIZE}px`, zIndex: 18 }}>
                                {item.type === 'COIN' && <CoinAsset />}
                                {item.type === 'POWERUP' && item.powerUpType && <PowerUpAsset type={item.powerUpType} />}
                            </div>
                        ))}
                        {row.obstacles.map((obs) => (
                            <div key={obs.id} className="absolute bottom-0 flex items-center justify-center" style={{ left: `${obs.x * GAME_CONFIG.GRID_SIZE}px`, width: `${(obs.width || 1) * GAME_CONFIG.GRID_SIZE}px`, height: `${GAME_CONFIG.GRID_SIZE}px`, zIndex: 20 }}>
                                {obs.type === 'TREE' && (obs.skin === 'COIN' ? <CoinAsset /> : <TreeAsset variant={Math.floor(obs.id * 100)} />)}
                                {obs.type === 'CAR' && <CarAsset type={Math.floor(obs.id * 100)} direction={obs.direction} subtype={obs.subtype} />}
                                {obs.type === 'LOG' && <LogAsset width={obs.width} />}
                                {obs.type === 'TRAIN' && <TrainAsset direction={obs.direction} />}
                            </div>
                        ))}
                    </div>
                 );
             })}
             {coinEffects.map(effect => (<div key={effect.id} className="absolute pointer-events-none z-40" style={{ left: `${effect.x * GAME_CONFIG.GRID_SIZE}px`, bottom: `${(effect.y - gameRef.current.cameraY) * GAME_CONFIG.GRID_SIZE}px`, width: `${GAME_CONFIG.GRID_SIZE}px`, height: `${GAME_CONFIG.GRID_SIZE}px` }}><CoinCollectEffect label={effect.label} /></div>))}
             <div className="absolute transition-none pointer-events-none" style={{ bottom: `${(gameRef.current.player.gridY - gameRef.current.cameraY) * GAME_CONFIG.GRID_SIZE}px`, left: `${gameRef.current.player.gridX * GAME_CONFIG.GRID_SIZE}px`, width: `${GAME_CONFIG.GRID_SIZE}px`, height: `${GAME_CONFIG.GRID_SIZE}px`, zIndex: 30 }}>
                 {activeEffect?.type === 'SHIELD' && <div className="absolute inset-0 rounded-full border-2 border-blue-400 bg-blue-500/20 animate-pulse z-[-1]"></div>}
                 {activeEffect?.type === 'TIME_SLOW' && <div className="absolute inset-0 rounded-full border-2 border-green-400 bg-green-500/20 animate-spin-slow z-[-1]"></div>}
                 {activeEffect?.type === 'MAGNET' && <div className="absolute inset-0 rounded-full border-2 border-yellow-400 bg-yellow-500/20 animate-ping z-[-1]"></div>}
                 {activeEffect?.type === 'WATER_WALK' && <div className="absolute inset-0 -bottom-1 h-2 w-full bg-cyan-400/50 blur-sm z-[-2]"></div>}
                 {activeEffect?.type === 'DOUBLE_COINS' && <div className="absolute inset-0 rounded-full border-2 border-amber-400 bg-amber-500/10 animate-pulse z-[-1]"></div>}
                 {deathReason !== 'WATER' && <PlayerAsset skin={activeSkin} isJumping={gameRef.current.isJumping} direction={gameRef.current.jumpDirection} isDead={gameRef.current.gameOver} />}
                 {gameRef.current.gameOver && gameResult === 'DIED' && <div className="absolute inset-0 -z-10 scale-125 opacity-90">{deathReason === 'WATER' ? <SplashAsset /> : <SplatAsset />}</div>}
             </div>
          </div>
      </div>
      
      {gameState === GameState.INTRO && <div className="absolute inset-0 z-[100] bg-[#1a1a20] flex flex-col items-center justify-center cursor-pointer overflow-hidden" onClick={() => { initAudio(); setGameState(GameState.MENU); }}><div className="absolute top-1/4 flex flex-col items-center gap-2"><h2 className="text-gray-500 font-pixel text-xl tracking-widest animate-pulse">PRESENTING</h2><h1 className="text-6xl md:text-8xl text-yellow-400 font-retro text-shadow-outline animate-pop-in" style={{ animationDelay: '0.5s' }}>CROSSY</h1><h1 className="text-6xl md:text-8xl text-white font-retro text-shadow-outline animate-pop-in" style={{ animationDelay: '1s' }}>CHICKEN</h1><h3 className="text-xl text-blue-300 font-retro mt-4 animate-pulse" style={{ animationDelay: '1.5s' }}>8-BIT EDITION</h3></div><div className="absolute bottom-1/4 left-0 w-full"><div className="w-16 h-16 animate-slide-across"><div className="animate-bounce-pixel w-full h-full"><PlayerAsset skin={INITIAL_SKINS[0]} isJumping={false} direction="right" /></div></div></div></div>}
      {gameState === GameState.MENU && <div className="absolute inset-0 z-[70] bg-black/70 flex flex-col items-center justify-center p-4 text-center"><div className="animate-float-pixel mb-8"><h1 className="text-6xl font-retro text-yellow-400 text-shadow-outline mb-2">CROSSY</h1><h1 className="text-6xl font-retro text-white text-shadow-outline">8-BIT</h1></div><div className="w-full max-w-xs space-y-3"><button onClick={() => { playClick(); startGame('CLASSIC'); }} className="w-full btn-retro bg-green-500 text-white py-3 text-xl font-bold border-2 border-black hover:bg-green-400">CLASSIC</button><button onClick={() => { playClick(); startGame('SURVIVAL'); }} className="w-full btn-retro bg-orange-600 text-white py-3 text-xl font-bold border-2 border-black hover:bg-orange-500">SURVIVAL</button><button onClick={() => { playClick(); setGameState(GameState.CHALLENGE_MENU); }} className="w-full btn-retro bg-blue-600 text-white py-3 text-xl font-bold border-2 border-black hover:bg-blue-500">CHALLENGES</button><div className="flex gap-3 mt-2 justify-center"><button onClick={() => { playClick(); setGameState(GameState.SHOP); }} className="w-16 h-16 bg-purple-500 border-2 border-black hover:bg-purple-400 flex items-center justify-center" title="Shop"><span className="text-3xl">🛒</span></button><button onClick={() => { playClick(); setGameState(GameState.GAMBLE_MENU); }} className="w-16 h-16 bg-red-500 border-2 border-black hover:bg-red-400 flex items-center justify-center" title="High Stakes"><span className="text-3xl">🎲</span></button></div></div></div>}
      {gameState === GameState.CHALLENGE_MENU && <div className="absolute inset-0 z-[75] bg-[#202028] flex flex-col items-center p-4 font-pixel text-white"><h2 className="text-3xl text-yellow-400 font-retro mb-6 text-center">CHALLENGES</h2><div className="w-full max-w-md space-y-4 overflow-y-auto pb-20">{CHALLENGES.map(challenge => (<div key={challenge.id} className="bg-slate-800 border-2 border-slate-600 p-4 hover:border-blue-400 transition-colors"><div className="flex justify-between items-start mb-2"><h3 className="text-xl font-bold text-blue-300">{challenge.title}</h3><span className={`text-xs px-2 py-1 rounded ${challenge.difficulty === 'EASY' ? 'bg-green-900 text-green-300' : challenge.difficulty === 'MEDIUM' ? 'bg-yellow-900 text-yellow-300' : 'bg-red-900 text-red-300'}`}>{challenge.difficulty}</span></div><p className="text-gray-300 text-sm mb-4">{challenge.description}</p><div className="flex justify-between items-center"><div className="text-yellow-400 text-sm">REWARD: ${challenge.reward}</div><button onClick={() => { playClick(); startGame('CHALLENGE', 0, challenge); }} className="bg-blue-600 px-4 py-2 border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 font-bold">START</button></div></div>))}</div><button onClick={() => setGameState(GameState.MENU)} className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-600 px-8 py-3 border-b-4 border-red-800 font-bold">BACK</button></div>}
      {gameState === GameState.GAME_OVER && <div className="absolute inset-0 z-[80] bg-black/80 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm"><div className="bg-slate-800 border-4 border-slate-950 p-1 w-full max-w-md relative shadow-2xl scale-105"><div className="absolute -top-2 -left-2 w-4 h-4 bg-gray-400 border-2 border-black" /><div className="absolute -top-2 -right-2 w-4 h-4 bg-gray-400 border-2 border-black" /><div className="absolute -bottom-2 -left-2 w-4 h-4 bg-gray-400 border-2 border-black" /><div className="absolute -bottom-2 -right-2 w-4 h-4 bg-gray-400 border-2 border-black" /><div className="border-4 border-slate-900 bg-[#202028] p-6 flex flex-col items-center gap-6"><div className="scale-150 image-pixelated p-4 bg-slate-900/50 rounded-full border-2 border-slate-700"><div className="w-16 h-16"><PlayerAsset skin={activeSkin} isJumping={false} direction="down" isDead={gameResult === 'DIED'} /></div></div>{activeGameMode === 'GAMBLE' ? (gameResult === 'DIED' ? (<div className="text-center"><h2 className="text-6xl font-retro text-red-500 text-shadow-outline tracking-tighter animate-bounce-pixel mb-2">BUSTED</h2><div className="bg-black/40 p-2 border border-red-900/50"><p className="text-gray-400 font-pixel text-xl">YOU LOST THE BET</p><p className="text-red-500 font-retro text-2xl line-through decoration-2 decoration-white/30">${gambleBet}</p></div></div>) : (<div className="text-center"><h2 className="text-5xl font-retro text-green-400 text-shadow-outline mb-2">WINNER</h2><div className="bg-black/40 p-2 border border-green-900/50"><p className="text-gray-400 font-pixel text-xl">PROFIT MADE</p><p className="text-yellow-400 font-retro text-3xl text-shadow-retro">+${Math.floor(gambleBet * gambleMultiplier) - gambleBet}</p></div></div>)) : gameResult === 'WIN' ? (<div className="text-center"><h2 className="text-4xl font-retro text-yellow-400 text-shadow-outline mb-2">COMPLETED!</h2><div className="bg-black/40 p-4 border border-yellow-600 text-white"><p className="mb-2">{activeChallenge?.title}</p><p className="text-green-400 text-xl">REWARD: ${activeChallenge?.reward}</p></div></div>) : (<><div className="text-center"><h2 className="text-5xl font-retro text-white text-shadow-outline mb-2">GAME OVER</h2>{deathReason === 'VOID' && <p className="text-red-400 font-pixel mb-2">CONSUMED BY THE VOID</p>}{deathReason === 'TRAIN' && <p className="text-red-400 font-pixel mb-2">SPLATTERED BY A TRAIN</p>}<div className="flex items-center justify-center gap-6 text-yellow-400 text-shadow-retro mt-2 bg-black/30 p-3 rounded border border-white/10"><div className="flex flex-col"><span className="text-xs text-gray-400 font-bold">SCORE</span><span className="text-4xl text-white">{score}</span></div>{activeGameMode !== 'CHALLENGE' && (<><div className="w-px h-10 bg-white/20" /><div className="flex flex-col"><span className="text-xs text-gray-400 font-bold">BEST</span><span className="text-4xl text-blue-300">{highScore}</span></div></>)}</div></div>{activeGameMode !== 'CHALLENGE' && (<div className="w-full bg-black/40 p-1 border-2 border-slate-700">{hasConverted ? (<div className="text-center bg-green-900/30 text-green-400 font-bold text-xl flex items-center justify-center gap-2 py-3"><span>✓ ${score} ADDED TO WALLET</span></div>) : (<button onClick={convertScore} disabled={score === 0} className={`w-full py-3 shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] font-bold text-xl flex items-center justify-center gap-3 transition-all active:translate-y-1 active:shadow-none ${score > 0 ? 'bg-yellow-500 hover:bg-yellow-400 text-black border-2 border-black animate-pulse' : 'bg-gray-700 text-gray-500 cursor-not-allowed border-2 border-gray-600'}`}><span>CONVERT SCORE</span>{score > 0 && (<div className="flex items-center bg-black/20 px-2 rounded text-sm"><span className="mr-1">+</span><span className="text-yellow-100">${score}</span></div>)}</button>)}</div>)}</>)}<div className="flex gap-3 w-full mt-2"><button onClick={() => { playClick(); setGameState(GameState.MENU); }} className="flex-1 py-3 bg-slate-600 text-white font-bold border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] hover:bg-slate-500 active:translate-y-1 active:shadow-none">MENU</button><button onClick={() => { playClick(); if (activeGameMode === 'GAMBLE') { setGameState(GameState.GAMBLE_MENU); } else if (activeGameMode === 'CHALLENGE' && activeChallenge) { startGame('CHALLENGE', 0, activeChallenge); } else { startGame(activeGameMode); } }} className="flex-1 py-3 bg-green-600 text-white font-bold border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] hover:bg-green-500 active:translate-y-1 active:shadow-none">{activeGameMode === 'GAMBLE' ? 'BET AGAIN' : 'RETRY'}</button></div></div></div></div>}
      {gameState === GameState.SHOP && <Shop coins={coins} skins={skins} currentSkinId={equippedSkinId} storedPowerUp={storedPowerUp} onClose={() => { playClick(); setGameState(GameState.MENU); }} onBuy={(id) => { const skin = skins.find(s => s.id === id); if(skin && coins >= skin.price) { playCashout(); setCoins(c => c - skin.price); setSkins(curr => curr.map(s => s.id === id ? {...s, owned: true} : s)); }}} onEquip={(id) => { playClick(); setEquippedSkinId(id); }} onBuyPowerUp={(type, price) => { playCashout(); setCoins(c => c - price); setStoredPowerUp(type); }} />}
      {gameState === GameState.GAMBLE_MENU && <Gamble coins={coins} onStartGamble={(bet) => { playClick(); startGame('GAMBLE', bet); }} onClose={() => { playClick(); setGameState(GameState.MENU); }} />}
      <div className="absolute bottom-8 left-0 w-full flex justify-center gap-4 z-[60] md:hidden pointer-events-none"><div className="pointer-events-auto grid grid-cols-3 gap-3"><div /><button className="w-16 h-16 bg-white/10 border-2 border-white/30 rounded active:bg-white/30 text-3xl" onTouchStart={(e) => { e.preventDefault(); handleInput('ArrowUp'); }}>⬆️</button><div /><button className="w-16 h-16 bg-white/10 border-2 border-white/30 rounded active:bg-white/30 text-3xl" onTouchStart={(e) => { e.preventDefault(); handleInput('ArrowLeft'); }}>⬅️</button><button className="w-16 h-16 bg-white/10 border-2 border-white/30 rounded active:bg-white/30 text-3xl" onTouchStart={(e) => { e.preventDefault(); handleInput('ArrowDown'); }}>⬇️</button><button className="w-16 h-16 bg-white/10 border-2 border-white/30 rounded active:bg-white/30 text-3xl" onTouchStart={(e) => { e.preventDefault(); handleInput('ArrowRight'); }}>➡️</button></div></div>
    </div>
  );
}
export default App;