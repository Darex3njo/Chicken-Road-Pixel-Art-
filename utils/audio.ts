
let ctx: AudioContext | null = null;
let muted = false;

const getCtx = () => {
    if (!ctx) {
        ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return ctx;
};

export const initAudio = () => {
    const context = getCtx();
    if (context.state === 'suspended') {
        context.resume();
    }
};

export const toggleMute = () => {
    muted = !muted;
    return muted;
};

export const isMuted = () => muted;

const createOsc = (type: OscillatorType, freq: number, duration: number, vol: number) => {
    if (muted) return;
    const context = getCtx();
    const osc = context.createOscillator();
    const gain = context.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, context.currentTime);
    
    gain.gain.setValueAtTime(vol, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(context.destination);
    
    osc.start();
    osc.stop(context.currentTime + duration);
};

export const playJump = () => {
    if (muted) return;
    const context = getCtx();
    const osc = context.createOscillator();
    const gain = context.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, context.currentTime);
    osc.frequency.linearRampToValueAtTime(300, context.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.05, context.currentTime);
    gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(context.destination);
    
    osc.start();
    osc.stop(context.currentTime + 0.1);
};

export const playCoin = () => {
    if (muted) return;
    const context = getCtx();
    const now = context.currentTime;
    
    // Ping 1
    const osc1 = context.createOscillator();
    const g1 = context.createGain();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(1200, now);
    g1.gain.setValueAtTime(0.05, now);
    g1.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc1.connect(g1);
    g1.connect(context.destination);
    osc1.start();
    osc1.stop(now + 0.1);

    // Ping 2
    const osc2 = context.createOscillator();
    const g2 = context.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(1800, now + 0.1);
    g2.gain.setValueAtTime(0.05, now + 0.1);
    g2.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc2.connect(g2);
    g2.connect(context.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.2);
};

export const playCrash = () => {
    if (muted) return;
    const context = getCtx();
    const osc = context.createOscillator();
    const gain = context.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, context.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.2, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(context.destination);
    
    osc.start();
    osc.stop(context.currentTime + 0.3);
};

export const playSplash = () => {
    if (muted) return;
    const context = getCtx();
    const bufferSize = context.sampleRate * 0.5;
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = context.createBufferSource();
    noise.buffer = buffer;

    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, context.currentTime);
    filter.frequency.linearRampToValueAtTime(100, context.currentTime + 0.5);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.2, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    noise.start();
};

export const playCashout = () => {
    if (muted) return;
    const context = getCtx();
    const now = context.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major Arpeggio
    
    notes.forEach((freq, i) => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        
        gain.gain.setValueAtTime(0.05, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0, now + i * 0.08 + 0.2);
        
        osc.connect(gain);
        gain.connect(context.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.2);
    });
};

export const playClick = () => {
    createOsc('square', 600, 0.05, 0.05);
};
