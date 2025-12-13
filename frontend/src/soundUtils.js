/**
 * Sound utility module for typing test audio feedback
 * Uses Web Audio API to generate simple tones for keypresses
 */

// Audio context singleton
let audioContext = null;

// Initialize audio context on first use
function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Play a short beep sound for correct keypress
 */
export function playCorrectSound() {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  // Pleasant tone for correct key
  oscillator.frequency.value = 800;
  oscillator.type = 'sine';
  
  // Short envelope
  gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
  
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.05);
}

/**
 * Play a different sound for incorrect keypress
 */
export function playErrorSound() {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  // Lower, slightly dissonant tone for errors
  oscillator.frequency.value = 200;
  oscillator.type = 'square';
  
  // Short envelope
  gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
  
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.08);
}

/**
 * Resume audio context if it was suspended (for browsers that require user interaction)
 */
export function resumeAudioContext() {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
}
