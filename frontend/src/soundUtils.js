/**
 * Sound utility module for typing test audio feedback
 * Uses Web Audio API to generate simple tones for keypresses
 */

// Audio context singleton
let audioContext = null;
let contextResumed = false;

// Initialize audio context on first use
function getAudioContext() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported', e);
      return null;
    }
  }
  return audioContext;
}

/**
 * Play a short beep sound for correct keypress
 */
export function playCorrectSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  // Pleasant tone for correct key
  oscillator.frequency.value = 800;
  oscillator.type = 'sine';
  
  // Short envelope with linear ramp to avoid audio glitches
  gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05);
  
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.05);
}

/**
 * Play a different sound for incorrect keypress
 */
export function playErrorSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  // Lower, slightly dissonant tone for errors
  oscillator.frequency.value = 200;
  oscillator.type = 'square';
  
  // Short envelope with linear ramp to avoid audio glitches
  gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
  
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.08);
}

/**
 * Resume audio context if it was suspended (for browsers that require user interaction)
 * Note: This initiates an async resume operation but returns immediately.
 * Returns true if resume was initiated or context is already running, false if unavailable.
 * The actual resume happens asynchronously, but we only need to call this once.
 */
export function resumeAudioContext() {
  const ctx = getAudioContext();
  if (!ctx) return false;
  
  if (ctx.state === 'suspended' && !contextResumed) {
    // Mark as resumed immediately to prevent multiple resume attempts
    contextResumed = true;
    ctx.resume().catch(err => {
      console.warn('Failed to resume audio context', err);
      contextResumed = false; // Reset on failure to allow retry
    });
    return true;
  }
  return ctx.state === 'running';
}
