/**
 * Utility to play a "ping" notification sound using pure Web Audio API.
 * Uses a singleton AudioContext that is resumed on user interaction.
 */
let sharedAudioCtx = null;
let isUnlocked = false;

// Initialize the shared context
const getAudioContext = () => {
  if (!sharedAudioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      sharedAudioCtx = new AudioContext();
    }
  }
  return sharedAudioCtx;
};

// Listen for first interaction to unlock the singleton context
if (typeof window !== 'undefined') {
  const unlock = async () => {
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      isUnlocked = true;
      console.log("🔊 Notification Audio Engine: UNLOCKED & READY");
      
      // Cleanup listener
      window.removeEventListener('mousedown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    }
  };
  window.addEventListener('mousedown', unlock);
  window.addEventListener('keydown', unlock);
  window.addEventListener('touchstart', unlock);
}

export const playNotificationSound = () => {
  const ctx = getAudioContext();
  
  if (!ctx || !isUnlocked) {
    console.log("🔇 Sound engine waiting for unlock...");
    return;
  }

  try {
    const now = ctx.currentTime;
    
    // Create a "Pro Pop" (Multi-layered to mimic high-end apps)
    // Layer 1: The "Body" (Lower frequency sweep)
    const bodyOsc = ctx.createOscillator();
    const bodyEnv = ctx.createGain();
    bodyOsc.type = 'sine';
    bodyOsc.frequency.setValueAtTime(400, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(100, now + 0.04);
    bodyEnv.gain.setValueAtTime(0, now);
    bodyEnv.gain.linearRampToValueAtTime(0.6, now + 0.002);
    bodyEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    bodyOsc.connect(bodyEnv);
    bodyEnv.connect(ctx.destination);

    // Layer 2: The "Click" (High-frequency transient for "sharpness")
    const clickOsc = ctx.createOscillator();
    const clickEnv = ctx.createGain();
    clickOsc.type = 'sine'; 
    clickOsc.frequency.setValueAtTime(2000, now);
    clickEnv.gain.setValueAtTime(0, now);
    clickEnv.gain.linearRampToValueAtTime(0.3, now + 0.001);
    clickEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
    clickOsc.connect(clickEnv);
    clickEnv.connect(ctx.destination);

    bodyOsc.start(now);
    bodyOsc.stop(now + 0.08);
    clickOsc.start(now);
    clickOsc.stop(now + 0.02);

    console.log("🔊 Pro Pop Triggered");

  } catch (error) {
    console.warn("Audio Context Notice:", error.message);
  }
};
