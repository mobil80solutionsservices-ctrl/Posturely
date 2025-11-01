/**
 * AudioSequenceManager - Manages audio playback timing and sequencing for exercises
 * Handles loading audio files from sounds folder into audio buffers and provides
 * methods for playing audio with loop and timing controls
 */
export class AudioSequenceManager {
    constructor() {
        this.audioContext = null;
        this.audioBuffers = new Map();
        this.currentAudio = null;
        this.currentAudioSource = null;
        this.isInitialized = false;
        this.natureSoundsSource = null;
        this.isPaused = false;
        this.pausedTime = 0;
        this.startTime = 0;
        
        console.log('🔊 AudioSequenceManager created');
    }
    
    /**
     * Initialize audio system and create AudioContext
     */
    async initialize() {
        try {
            console.log('🔄 Initializing AudioSequenceManager...');
            
            // Create AudioContext
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Handle browser audio policy - resume context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Load all audio files
            await this.loadAudioFiles();
            
            this.isInitialized = true;
            console.log('✅ AudioSequenceManager initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize AudioSequenceManager:', error);
            throw error;
        }
    }
    
    /**
     * Load all audio files from sounds folder into audio buffers
     */
    async loadAudioFiles() {
        console.log('🔄 Loading audio files...');
        
        // List of all available audio files in sounds folder
        const audioFiles = [
            'beep.mp3',
            'correctposture.mp3',
            'countdown.mp3', 
            'faceforward.mp3',
            'incamera.mp3',
            'meditationstarted.mp3',
            'nature.mp3',
            'neckrepeat.mp3',
            'neckrotationstarted.mp3',
            'nowturnright.mp3',
            'sitstraight.mp3',
            'sittall.mp3',
            'tiltdown.mp3',
            'tiltrepeat.mp3',
            'tiltupward.mp3',
            'tiltupwardnew.mp3',
            'turnlefttillbeep.mp3',
            'turntoside.mp3',
            'welldone.mp3'
        ];
        
        const loadPromises = audioFiles.map(filename => this.loadAudioFile(filename));
        
        try {
            await Promise.all(loadPromises);
            console.log(`✅ Audio files loaded successfully: ${audioFiles.length} files`);
            return true;
        } catch (error) {
            console.error('❌ Failed to load some audio files:', error);
            throw error;
        }
    }
    
    /**
     * Load individual audio file into buffer
     */
    async loadAudioFile(filename) {
        try {
            const response = await fetch(`sounds/${filename}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${filename}: ${response.status}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            this.audioBuffers.set(filename, audioBuffer);
            console.log(`📁 Loaded audio file: ${filename}`);
        } catch (error) {
            console.error(`❌ Failed to load audio file ${filename}:`, error);
            // Don't throw - allow other files to load
        }
    }
    
    /**
     * Play specific audio file with loop and timing controls
     */
    async playAudio(filename, loop = false, volume = 1.0) {
        return new Promise((resolve, reject) => {
            try {
                // Stop any currently playing audio
                this.stopCurrentAudio();
                
                // Get audio buffer
                const audioBuffer = this.audioBuffers.get(filename);
                if (!audioBuffer) {
                    console.warn(`⚠️ Audio file not found: ${filename}`);
                    resolve(); // Resolve anyway to not break exercise flow
                    return;
                }
                
                console.log(`🔊 Playing audio: ${filename}, loop: ${loop}, volume: ${volume}`);
                
                // Create audio source
                const source = this.audioContext.createBufferSource();
                const gainNode = this.audioContext.createGain();
                
                source.buffer = audioBuffer;
                source.loop = loop;
                gainNode.gain.value = volume;
                
                // Connect audio graph
                source.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                // Store current audio reference
                this.currentAudio = { source, gainNode, filename, loop };
                this.currentAudioSource = source;
                
                // Handle audio end
                source.onended = () => {
                    if (!loop) {
                        console.log(`✅ Audio playback completed: ${filename}`);
                        this.currentAudio = null;
                        this.currentAudioSource = null;
                        resolve();
                    }
                };
                
                // Start playback
                source.start(0);
                this.startTime = this.audioContext.currentTime;
                this.pausedTime = 0;
                
                // If looping, resolve immediately
                if (loop) {
                    resolve();
                }
                
            } catch (error) {
                console.error(`❌ Failed to play audio ${filename}:`, error);
                reject(error);
            }
        });
    }
    
    /**
     * Stop current audio
     */
    stopCurrentAudio() {
        if (this.currentAudioSource) {
            try {
                this.currentAudioSource.stop();
                console.log('⏹️ Stopped current audio');
            } catch (error) {
                // Audio might already be stopped
                console.log('⏹️ Audio already stopped');
            }
            this.currentAudio = null;
            this.currentAudioSource = null;
        }
    }
    
    /**
     * Stop all audio including nature sounds
     */
    stopAll() {
        console.log('⏹️ Stopping all audio');
        this.stopCurrentAudio();
        this.stopNatureSounds();
    }
    
    /**
     * Pause all audio
     */
    pauseAll() {
        if (this.currentAudioSource && !this.isPaused) {
            console.log('⏸️ Pausing all audio');
            this.pausedTime = this.audioContext.currentTime - this.startTime;
            this.stopCurrentAudio();
            this.isPaused = true;
        }
    }
    
    /**
     * Resume all audio
     */
    resumeAll() {
        if (this.isPaused && this.currentAudio) {
            console.log('▶️ Resuming all audio');
            const { filename, loop, gainNode } = this.currentAudio;
            
            // Recreate and resume audio from paused position
            const audioBuffer = this.audioBuffers.get(filename);
            if (audioBuffer) {
                const source = this.audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.loop = loop;
                source.connect(gainNode);
                
                source.start(0, this.pausedTime);
                this.currentAudioSource = source;
                this.startTime = this.audioContext.currentTime - this.pausedTime;
            }
            
            this.isPaused = false;
        }
    }
    
    /**
     * Play audio sequence with proper timing
     */
    async playSequence(audioSequence) {
        console.log('🎵 Playing audio sequence:', audioSequence.map(a => a.filename));
        
        for (const audioItem of audioSequence) {
            const { filename, loop = false, delay = 0, volume = 1.0 } = audioItem;
            
            // Add delay before playing if specified
            if (delay > 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            
            // Play audio
            await this.playAudio(filename, loop, volume);
        }
        
        console.log('✅ Audio sequence completed');
    }
    
    /**
     * Start nature sounds looping for meditation phase
     */
    startNatureSoundsLoop() {
        console.log('🌿 Starting nature sounds loop');
        
        try {
            // Stop any existing nature sounds
            this.stopNatureSounds();
            
            const audioBuffer = this.audioBuffers.get('nature.mp3');
            if (!audioBuffer) {
                console.warn('⚠️ Nature sounds file not found');
                return null;
            }
            
            // Create looping nature sounds
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            source.buffer = audioBuffer;
            source.loop = true;
            gainNode.gain.value = 0.3; // Lower volume for background
            
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            source.start(0);
            this.natureSoundsSource = source;
            
            console.log('✅ Nature sounds loop started');
            return source;
            
        } catch (error) {
            console.error('❌ Failed to start nature sounds:', error);
            return null;
        }
    }
    
    /**
     * Stop nature sounds loop
     */
    stopNatureSounds() {
        if (this.natureSoundsSource) {
            try {
                this.natureSoundsSource.stop();
                console.log('⏹️ Stopped nature sounds');
            } catch (error) {
                console.log('⏹️ Nature sounds already stopped');
            }
            this.natureSoundsSource = null;
        }
    }
    
    /**
     * Get audio file duration
     */
    getAudioDuration(filename) {
        const audioBuffer = this.audioBuffers.get(filename);
        return audioBuffer ? audioBuffer.duration : 0;
    }
    
    /**
     * Check if specific audio file is loaded
     */
    isAudioLoaded(filename) {
        return this.audioBuffers.has(filename);
    }
    
    /**
     * Check if audio system is ready
     */
    isReady() {
        return this.isInitialized && this.audioContext && this.audioContext.state === 'running';
    }
    
    /**
     * Ensure audio system is ready (resume context if needed)
     */
    async ensureReady() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        if (this.audioContext && this.audioContext.state === 'suspended') {
            console.log('🔄 Resuming suspended AudioContext...');
            await this.audioContext.resume();
        }
        
        return this.isReady();
    }
    
    /**
     * Get current audio context state
     */
    getAudioContextState() {
        return this.audioContext ? this.audioContext.state : 'not-initialized';
    }
    
    /**
     * Resume audio context (needed for browser audio policies)
     */
    async resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
            console.log('🔄 Audio context resumed');
        }
    }
    
    // ========== AUDIO TIMING AND SYNCHRONIZATION METHODS ==========
    
    /**
     * Play audio with pose synchronization callback
     * Allows exercises to sync audio with pose detection phases
     */
    async playAudioWithPoseSync(filename, options = {}) {
        const {
            loop = false,
            volume = 1.0,
            onPoseDetected = null,
            onPoseLost = null,
            syncInterval = 100 // Check pose every 100ms
        } = options;
        
        console.log(`🔊🤖 Playing audio with pose sync: ${filename}`);
        
        // Start audio playback
        const audioPromise = this.playAudio(filename, loop, volume);
        
        // Set up pose synchronization if callbacks provided
        let syncInterval_id = null;
        if (onPoseDetected || onPoseLost) {
            syncInterval_id = setInterval(() => {
                // These callbacks will be called by the exercise controllers
                // when they detect pose changes during audio playback
            }, syncInterval);
        }
        
        // Wait for audio to complete (if not looping)
        if (!loop) {
            await audioPromise;
            if (syncInterval_id) {
                clearInterval(syncInterval_id);
            }
        }
        
        return { audioPromise, syncInterval_id };
    }
    
    /**
     * Interrupt current audio and play correction audio
     * Used for posture corrections during exercises
     */
    async interruptWithCorrection(correctionAudioFile, options = {}) {
        const {
            loop = true,
            volume = 1.0,
            fadeOut = false,
            fadeOutDuration = 500
        } = options;
        
        console.log(`⚠️🔊 Interrupting audio for correction: ${correctionAudioFile}`);
        
        // Store current audio state for resumption
        const previousAudio = this.currentAudio;
        const wasPaused = this.isPaused;
        
        // Fade out current audio if requested
        if (fadeOut && this.currentAudio) {
            await this.fadeOutCurrentAudio(fadeOutDuration);
        } else {
            this.stopCurrentAudio();
        }
        
        // Play correction audio
        await this.playAudio(correctionAudioFile, loop, volume);
        
        return {
            previousAudio,
            wasPaused,
            resume: () => this.resumeFromCorrection(previousAudio, wasPaused)
        };
    }
    
    /**
     * Resume audio after correction
     */
    async resumeFromCorrection(previousAudio, wasPaused) {
        console.log('🔄 Resuming audio after correction');
        
        // Stop correction audio
        this.stopCurrentAudio();
        
        // Resume previous audio if it was playing
        if (previousAudio && !wasPaused) {
            const { filename, loop, gainNode } = previousAudio;
            await this.playAudio(filename, loop, gainNode ? gainNode.gain.value : 1.0);
        }
    }
    
    /**
     * Fade out current audio over specified duration
     */
    async fadeOutCurrentAudio(duration = 500) {
        return new Promise((resolve) => {
            if (!this.currentAudio || !this.currentAudio.gainNode) {
                resolve();
                return;
            }
            
            const gainNode = this.currentAudio.gainNode;
            const startVolume = gainNode.gain.value;
            const startTime = this.audioContext.currentTime;
            
            // Linear fade out
            gainNode.gain.linearRampToValueAtTime(0, startTime + (duration / 1000));
            
            setTimeout(() => {
                this.stopCurrentAudio();
                resolve();
            }, duration);
        });
    }
    
    /**
     * Play countdown audio with visual feedback integration
     * Returns countdown events for UI synchronization
     */
    async playCountdownWithFeedback(countdownFile = 'countdown.mp3', options = {}) {
        const {
            duration = 3000, // 3 seconds default
            onCountdownTick = null,
            onCountdownComplete = null,
            tickInterval = 1000 // 1 second ticks
        } = options;
        
        console.log(`⏰ Playing countdown with feedback: ${countdownFile}`);
        
        // Start countdown audio
        const audioPromise = this.playAudio(countdownFile);
        
        // Generate countdown ticks for visual feedback
        let tickCount = Math.floor(duration / tickInterval);
        const tickTimer = setInterval(() => {
            if (onCountdownTick) {
                onCountdownTick(tickCount);
            }
            tickCount--;
            
            if (tickCount <= 0) {
                clearInterval(tickTimer);
                if (onCountdownComplete) {
                    onCountdownComplete();
                }
            }
        }, tickInterval);
        
        // Wait for audio to complete
        await audioPromise;
        
        return {
            completed: true,
            duration: duration
        };
    }
    
    /**
     * Synchronize audio with exercise phase transitions
     * Manages timing between different exercise phases
     */
    async synchronizePhaseTransition(fromPhase, toPhase, transitionAudio = null) {
        console.log(`🔄 Synchronizing phase transition: ${fromPhase} → ${toPhase}`);
        
        // Stop current phase audio
        this.stopCurrentAudio();
        
        // Add small gap between phases
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Play transition audio if provided
        if (transitionAudio) {
            await this.playAudio(transitionAudio);
        }
        
        console.log(`✅ Phase transition completed: ${fromPhase} → ${toPhase}`);
        return true;
    }
    
    /**
     * Create timed audio sequence with precise timing control
     * Used for complex exercise sequences with specific timing requirements
     */
    async playTimedSequence(sequence) {
        console.log('⏰🎵 Playing timed audio sequence');
        
        for (const item of sequence) {
            const {
                filename,
                duration = null, // If specified, stop audio after this duration
                loop = false,
                volume = 1.0,
                delay = 0,
                fadeIn = false,
                fadeOut = false,
                fadeInDuration = 500,
                fadeOutDuration = 500
            } = item;
            
            // Pre-delay
            if (delay > 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            
            // Start audio
            const audioPromise = this.playAudio(filename, loop, volume);
            
            // Handle fade in
            if (fadeIn && this.currentAudio && this.currentAudio.gainNode) {
                const gainNode = this.currentAudio.gainNode;
                gainNode.gain.value = 0;
                gainNode.gain.linearRampToValueAtTime(volume, 
                    this.audioContext.currentTime + (fadeInDuration / 1000));
            }
            
            // Handle duration limit
            if (duration && duration > 0) {
                setTimeout(async () => {
                    if (fadeOut && this.currentAudio) {
                        await this.fadeOutCurrentAudio(fadeOutDuration);
                    } else {
                        this.stopCurrentAudio();
                    }
                }, duration);
                
                // Wait for the specified duration
                await new Promise(resolve => setTimeout(resolve, duration));
            } else if (!loop) {
                // Wait for audio to complete naturally
                await audioPromise;
            }
        }
        
        console.log('✅ Timed sequence completed');
    }
    
    /**
     * Handle audio interruption and resumption for posture corrections
     * Provides smooth audio experience during exercise corrections
     */
    createCorrectionHandler() {
        let correctionState = {
            isInCorrection: false,
            originalAudio: null,
            correctionAudio: null,
            resumeCallback: null
        };
        
        return {
            // Start correction mode
            startCorrection: async (correctionAudioFile = 'correctposture.mp3') => {
                if (correctionState.isInCorrection) return;
                
                console.log('🚨 Starting posture correction audio');
                correctionState.isInCorrection = true;
                correctionState.originalAudio = this.currentAudio;
                
                // Pause current audio
                this.pauseAll();
                
                // Play correction audio on loop
                correctionState.correctionAudio = await this.playAudio(correctionAudioFile, true, 0.8);
                
                return correctionState;
            },
            
            // End correction mode
            endCorrection: async () => {
                if (!correctionState.isInCorrection) return;
                
                console.log('✅ Ending posture correction audio');
                
                // Stop correction audio
                this.stopCurrentAudio();
                
                // Resume original audio
                this.resumeAll();
                
                correctionState.isInCorrection = false;
                correctionState.originalAudio = null;
                correctionState.correctionAudio = null;
                
                return true;
            },
            
            // Check if in correction mode
            isInCorrection: () => correctionState.isInCorrection,
            
            // Get correction state
            getState: () => ({ ...correctionState })
        };
    }
}