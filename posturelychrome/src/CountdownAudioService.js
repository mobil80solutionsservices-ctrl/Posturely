/**
 * CountdownAudioService - Manages countdown audio for scan initiation
 * Provides "3-2-1" countdown audio before scan capture with visual countdown display
 */
export class CountdownAudioService {
    constructor() {
        this.audioContext = null;
        this.isPlaying = false;
        this.countdownCallback = null;
        this.countdownInterval = null;
        this.safetyTimeout = null;
    }

    /**
     * Initialize audio context
     */
    initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    /**
     * Play countdown beep sound
     * @param {number} frequency - Frequency of the beep (default: 600Hz)
     * @param {number} duration - Duration of the beep in seconds (default: 0.3s)
     */
    playCountdownBeep(frequency = 600, duration = 0.3) {
        this.initAudioContext();
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
        
        console.log('🎵 Playing countdown beep');
    }

    /**
     * Play final capture beep (higher pitch)
     */
    playFinalBeep() {
        this.playCountdownBeep(800, 0.5);
        console.log('📸 Playing final capture beep');
    }

    /**
     * Start countdown sequence with audio and visual feedback
     * @param {Function} onCountdownUpdate - Callback for countdown updates (count, isComplete)
     * @param {Function} onComplete - Callback when countdown completes
     * @param {number} startCount - Starting count (default: 3)
     */
    startCountdownSequence(onCountdownUpdate, onComplete, startCount = 3) {
        if (this.isPlaying) {
            console.warn('Countdown already in progress');
            return;
        }

        this.isPlaying = true;
        this.countdownCallback = onCountdownUpdate;
        
        console.log('🎯 Starting countdown sequence');
        
        // Safety timeout to prevent hanging
        this.safetyTimeout = setTimeout(() => {
            console.log('🎯 Safety timeout - stopping countdown');
            this.stopCountdown();
            if (onComplete) onComplete();
        }, (startCount + 2) * 1000);
        
        let count = startCount;
        
        // Initial countdown display
        if (this.countdownCallback) {
            this.countdownCallback(count, false);
        }
        
        // Countdown interval
        this.countdownInterval = setInterval(() => {
            // Play beep for current number
            if (count > 0) {
                this.playCountdownBeep();
            } else {
                // Play final capture beep
                this.playFinalBeep();
            }
            
            count--;
            
            // Update visual countdown
            if (this.countdownCallback) {
                this.countdownCallback(Math.max(0, count + 1), count < 0);
            }
            
            // Check if countdown is complete
            if (count < 0) {
                clearInterval(this.countdownInterval);
                clearTimeout(this.safetyTimeout);
                this.isPlaying = false;
                
                console.log('🎯 Countdown sequence complete');
                
                // Delay completion callback to allow final beep to play
                setTimeout(() => {
                    if (onComplete) onComplete();
                }, 500);
            }
        }, 1000);
    }

    /**
     * Stop countdown sequence
     */
    stopCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        
        if (this.safetyTimeout) {
            clearTimeout(this.safetyTimeout);
            this.safetyTimeout = null;
        }
        
        this.isPlaying = false;
        console.log('🎯 Countdown stopped');
    }

    /**
     * Check if countdown is currently playing
     * @returns {boolean}
     */
    isCountdownPlaying() {
        return this.isPlaying;
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stopCountdown();
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}