import { DataPersistenceManager } from './src/DataPersistenceManager.js';
import { AIServicesManager } from './src/AIServicesManager.js';
import { LanguageModelManager } from './src/LanguageModelManager.js';
import { EnhancedLanguageManager } from './src/EnhancedLanguageManager.js';
import { LocalizationService } from './src/LocalizationService.js';
import { BreakReminderManager } from './src/BreakReminderManager.js';
import { GoalTracker } from './src/GoalTracker.js';
import { BadgeSystem } from './src/BadgeSystem.js';
import { ComprehensiveAchievementManager } from './src/ComprehensiveAchievementManager.js';
import { AIMotivationManager } from './src/AIMotivationManager.js';

import { PostureThresholdMonitor } from './src/PostureThresholdMonitor.js';
import { AudioAlertService } from './src/AudioAlertService.js';
import { EnhancedScanManager } from './src/EnhancedScanManager.js';

// Check secure context for Chrome AI features
if (!isSecureContext) {
    console.warn('Chrome AI Translation API requires HTTPS. Some features may not be available.');
}

document.addEventListener('DOMContentLoaded', function() {
    const startTrackingBtn = document.getElementById('startTracking');
    const startScanBtn = document.getElementById('startScan');
    const guidedExercisesBtn = document.getElementById('guidedExercisesBtn');
    const stopTrackingBtn = document.getElementById('stopTracking');
    const statusDiv = document.getElementById('status');
    const scoreDisplay = document.getElementById('scoreDisplay');
    const scoreValue = document.getElementById('scoreValue');
    const scoreStatus = document.getElementById('scoreStatus');

    const languageToggle = document.getElementById('languageToggle');
    const debugTranslation = document.getElementById('debugTranslation');
    const languageModal = document.getElementById('languageModal');
    const closeLanguageModal = document.getElementById('closeLanguageModal');
    const languageList = document.getElementById('languageList');
    const downloadProgress = document.getElementById('downloadProgress');
    const downloadLanguageName = document.getElementById('downloadLanguageName');
    const downloadPercentage = document.getElementById('downloadPercentage');
    const progressFill = document.getElementById('progressFill');

    // Settings modal elements
    const settingsToggle = document.getElementById('settingsToggle');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsModal = document.getElementById('closeSettingsModal');
    const breakRemindersEnabled = document.getElementById('breakRemindersEnabled');
    const reminderFrequency = document.getElementById('reminderFrequency');
    const frequencyValue = document.getElementById('frequencyValue');
    const postureThreshold = document.getElementById('postureThreshold');
    const thresholdValue = document.getElementById('thresholdValue');
    const audioAlertsEnabled = document.getElementById('audioAlertsEnabled');
    const alertVolume = document.getElementById('alertVolume');
    const alertVolumeValue = document.getElementById('alertVolumeValue');
    const alertType = document.getElementById('alertType');
    const testAudioAlert = document.getElementById('testAudioAlert');
    const totalReminders = document.getElementById('totalReminders');
    const acceptedBreaks = document.getElementById('acceptedBreaks');
    const acceptanceRate = document.getElementById('acceptanceRate');
    const videoSection = document.getElementById('videoSection');
    const hero = document.getElementById('hero');
    const inactiveBlock = document.getElementById('inactiveBlock');
    const summaryBlock = document.getElementById('summaryBlock');
    const motivationBlock = document.getElementById('motivationBlock');
    const viewPastDataBtn = document.getElementById('viewPastDataBtn');

    // Goal tracking elements
    const goalsSection = document.getElementById('goalsSection');
    const goalsSettingsBtn = document.getElementById('goalsSettingsBtn');
    const goalProgress = document.getElementById('goalProgress');
    const streakDisplay = document.getElementById('streakDisplay');
    const streakNumber = document.getElementById('streakNumber');
    const goalsModal = document.getElementById('goalsModal');
    const closeGoalsModal = document.getElementById('closeGoalsModal');
    const dailyMinutesSlider = document.getElementById('dailyMinutesSlider');
    const dailyMinutesValue = document.getElementById('dailyMinutesValue');
    const postureScoreSlider = document.getElementById('postureScoreSlider');
    const postureScoreValue = document.getElementById('postureScoreValue');
    const streakGoalSlider = document.getElementById('streakGoalSlider');
    const streakGoalValue = document.getElementById('streakGoalValue');

    // Badge system elements
    const badgesSection = document.getElementById('badgesSection');
    const badgesCount = document.getElementById('badgesCount');
    const recentBadges = document.getElementById('recentBadges');

    // Mood modal elements
    const moodModal = document.getElementById('moodModal');
    const moodInput = document.getElementById('moodInput');
    const moodCharCount = document.getElementById('moodCharCount');
    const skipMoodBtn = document.getElementById('skipMoodBtn');
    const startWithMoodBtn = document.getElementById('startWithMoodBtn');
    const recentMoodBlock = document.getElementById('recentMoodBlock');
    const recentMoodContent = document.getElementById('recentMoodContent');

    // Timer elements
    const timerDisplay = document.getElementById('timerDisplay');
    const timerValue = document.getElementById('timerValue');

    const scanSection = document.getElementById('scanSection');
    const captureScanBtn = document.getElementById('captureScan');
    const cancelScanBtn = document.getElementById('cancelScan');
    const countdownOverlay = document.getElementById('countdownOverlay');
    const countdownValueElement = document.getElementById('countdownValue');
    
    // Video and canvas elements
    const cameraVideo = document.getElementById('cameraVideo');
    const poseCanvas = document.getElementById('poseCanvas');
    const scanVideo = document.getElementById('scanVideo');
    const scanCanvas = document.getElementById('scanCanvas');
    const autoCaptureToggle = document.getElementById('autoCaptureToggle');
    const autoCaptureStatus = document.getElementById('autoCaptureStatus');
    
    let isTracking = false;
    let isScanning = false;
    let poseNet = null;
    let currentPose = null;
    let score = 0;
    let smoothedScore = 0;
    let isCalibrated = false;
    let baselinePose = null;
    let poseCtx = null;
    let scanCtx = null;
    let autoCaptureEnabled = false;
    let fullBodyStableSince = 0;
    let lastAutoCaptureAt = 0;
    const FULL_BODY_STABLE_MS = 1200;
    const AUTO_CAPTURE_COOLDOWN_MS = 5000;
    
    // Desktop-style tracking state
    let postureRatio = 0.0;
    let lastPostureRatio = 0.0;
    let calibratedRatio = 0.0;
    let isRatioCalibrated = false;
    let ratioStuckStartTime = 0;
    let isRatioStuck = false;
    let ratioChangeStreak = 0;
    let isUserVisible = true;
    let hasSessionStarted = false;
    let isAudioSequencePlaying = false;
    let showCountdown = false;
    let countdownValue = 0;
    let lowScoreTicks = 0;
    let beepTick = 0;
    let updateCounter = 0;
    let trackingTimerId = null;
    let storageFlushCounter = 0;
    let currentSessionId = null;
    let sessionStartTime = null;
    let sessionMinutes = 0;
    let currentMood = '';
    let sessionTimerInterval = null;
    let sessionStartTimestamp = null;

    // Initialize DataPersistenceManager
    const dataManager = new DataPersistenceManager();
    
    // Initialize AIServicesManager
    const aiManager = new AIServicesManager();
    
    // Initialize BreakReminderManager
    const breakReminderManager = new BreakReminderManager();
    
    // Initialize GoalTracker and BadgeSystem
    const goalTracker = new GoalTracker();
    const badgeSystem = new BadgeSystem();
    const comprehensiveAchievementManager = new ComprehensiveAchievementManager();
    
    // Initialize AI Motivation Manager
    const aiMotivationManager = new AIMotivationManager();
    
    // Initialize Enhanced Language Manager
    const enhancedLanguageManager = new EnhancedLanguageManager();
    
    // Initialize Localization Service
    const localizationService = new LocalizationService();
    
    // Initialize Audio Alert Service and Posture Threshold Monitor
    const audioAlertService = new AudioAlertService();
    const postureThresholdMonitor = new PostureThresholdMonitor(audioAlertService);
    
    // Initialize Enhanced Scan Manager
    const enhancedScanManager = new EnhancedScanManager();
    
    // Initialize AI services (including language manager)
    aiManager.initialize().then(() => {
        // Initialize AI Motivation Manager
        aiMotivationManager.initialize().then((initialized) => {
            if (initialized) {
                console.log('✅ AI Motivation Manager ready for dynamic summaries and motivation');
            } else {
                console.log('⚠️ AI Motivation Manager using fallback mode');
            }
        });
        
        // Initialize enhanced language manager and localization service
        enhancedLanguageManager.initialize();
        localizationService.initialize();
        
        // Set localization service for achievement manager
        comprehensiveAchievementManager.setLocalizationService(localizationService);
        
        // Set up language change listener to trigger interface translation
        document.addEventListener('languageChanged', async (event) => {
            console.log('Language changed event received:', event.detail);
            try {
                // Update localization service current language
                localizationService.currentLanguage = event.detail.language;
                
                // Translate the current interface
                await localizationService.translateCurrentInterface();
                console.log(`Interface translated to ${event.detail.languageName}`);
            } catch (error) {
                console.error('Failed to translate interface:', error);
            }
        });
        
        // Make localization service globally available for testing
        window.localizationService = localizationService;
        window.testTranslation = async (languageCode) => {
            console.log(`Testing translation to ${languageCode}`);
            await localizationService.forceTranslateInterface(languageCode);
        };
        
        // Initialize audio alert services
        audioAlertService.loadPreferences();
        postureThresholdMonitor.loadConfiguration();
        // Check and display Origin Trial status after AI services are initialized
        checkAndDisplayOriginTrialStatus();
    });

    // ---------- Stats persistence ----------
    function ymd(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    // Data validation and migration
    async function validateAndMigrateData() {
        return new Promise((resolve) => {
            getStats(stats => {
                let migrated = false;

                for (const [key, rec] of Object.entries(stats)) {
                    // Migrate from seconds to minutes if needed
                    if (rec.seconds && !rec.minutes) {
                        rec.minutes = Math.floor(rec.seconds / 60);
                        delete rec.seconds;
                        migrated = true;
                        console.log(`Migrated ${key}: ${rec.minutes} minutes`);
                    }

                    // Ensure sessions array exists
                    if (!rec.sessions) {
                        rec.sessions = [];
                        migrated = true;
                    }

                    // Ensure all required fields exist
                    if (typeof rec.minutes !== 'number') rec.minutes = 0;
                    if (typeof rec.scoreSum !== 'number') rec.scoreSum = 0;
                    if (typeof rec.samples !== 'number') rec.samples = 0;
                    if (typeof rec.notes !== 'string') rec.notes = '';
                }

                if (migrated) {
                    setStats(stats, () => {
                        console.log('Data migration completed: seconds -> minutes');
                        resolve(true);
                    });
                } else {
                    resolve(false);
                }
            });
        });
    }

    function mondayStartOfWeek(d) {
        const date = new Date(d);
        const day = (date.getDay() + 6) % 7; // 0=Mon ... 6=Sun
        date.setDate(date.getDate() - day);
        date.setHours(0,0,0,0);
        return date;
    }

    function getStats(cb) {
        chrome.storage.local.get(['statsByDate'], res => {
            cb(res.statsByDate || {});
        });
    }

    function setStats(stats, cb) {
        chrome.storage.local.set({ statsByDate: stats }, cb);
    }

    async function addMinutesToToday(minutesToAdd, scoreOpt) {
        await dataManager.addMinutesToToday(minutesToAdd, scoreOpt);
    }

    // ---------- Weekly strip rendering ----------
    // REMOVED: renderWeekStrip function - no longer displaying weekly calendar strip in main interface
    // Weekly data is now accessible through the "View Past Data" button which opens analytics dashboard
    
    // Audio context for beeps
    let audioContext = null;
    
    // Function to force hide countdown overlay
    function hideCountdownOverlay() {
        if (countdownOverlay) {
            countdownOverlay.classList.add('hidden');
            countdownOverlay.style.display = 'none';
            console.log('🎯 Force hiding countdown overlay');
        }
        showCountdown = false;
        isAudioSequencePlaying = false;
    }
    
    // Check current tracking status
    chrome.storage.local.get(['isTracking', 'isScanning'], function(result) {
        updateUI(result.isTracking || false, result.isScanning || false);
        
        // Initialize toolbar icon state
        initializeToolbarIcon();
    });


    
    // Initialize MediaPipe Tasks Vision PoseLandmarker (local WASM)
    async function initializePoseDetection() {
        try {
            // Dynamically import the ES module from the extension package
            const visionBundleUrl = chrome.runtime.getURL('mediapipe/vision_bundle.mjs');
            const tv = await import(visionBundleUrl);
            if (!tv || !tv.FilesetResolver || !tv.PoseLandmarker) {
                throw new Error('MediaPipe Tasks Vision bundle not loaded');
            }
            const wasmRoot = chrome.runtime.getURL('mediapipe/wasm');
            const modelPath = chrome.runtime.getURL('mediapipe/models/pose_landmarker_lite.task');
            const vision = await tv.FilesetResolver.forVisionTasks(wasmRoot);
            const landmarker = await tv.PoseLandmarker.createFromOptions(vision, {
                baseOptions: { modelAssetPath: modelPath },
                runningMode: 'VIDEO',
                numPoses: 1,
                minPoseDetectionConfidence: 0.5,
                minPosePresenceConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
            // Adapt landmarker API to our estimateSinglePose(video) contract
            poseNet = {
                estimateSinglePose: async (video) => {
                    const startTimeMs = performance.now();
                    const result = landmarker.detectForVideo(video, startTimeMs);
                    const lm = (result && result.landmarks && result.landmarks[0]) || [];
                    // Convert to keypoints array compatible with our drawing/scoring code
                    const keypoints = lm.map((p, idx) => ({
                        part: mediapipeIndexToPart(idx),
                        position: { x: p.x * (video.videoWidth || 640), y: p.y * (video.videoHeight || 480) },
                        score: p.visibility ?? 1
                    }));
                    return { keypoints };
                }
            };
            console.log('MediaPipe PoseLandmarker initialized (local WASM)');
            return true;
        } catch (error) {
            console.error('Failed to initialize pose detection:', error);
            return false;
        }
    }

    function mediapipeIndexToPart(index) {
        // Expanded mapping for full-body checks and drawing
        const map = {
            0: 'nose',
            2: 'leftEye',
            5: 'rightEye',
            7: 'leftEar',
            8: 'rightEar',
            11: 'leftShoulder',
            12: 'rightShoulder',
            13: 'leftElbow',
            14: 'rightElbow',
            15: 'leftWrist',
            16: 'rightWrist',
            23: 'leftHip',
            24: 'rightHip',
            25: 'leftKnee',
            26: 'rightKnee',
            27: 'leftAnkle',
            28: 'rightAnkle'
        };
        return map[index] || '';
    }
    
    // Handle pose detection results (exact same logic as desktop app)
    function onPoseResults(pose) {
        if (!poseCtx && !scanCtx) return;
        
        currentPose = pose.keypoints;
        
        if (currentPose && currentPose.length >= 33) {
            // Convert PoseNet keypoints to desktop format (x, y pairs)
            const landmarks = new Array(33).fill(null).map(() => [0, 0]);
            // PoseNet provides 17 keypoints; map those we need. Fallback to previous when missing.
            function setPart(partName, idx) {
                const kp = currentPose.find(k => k.part === partName);
                if (kp && kp.position) {
                    landmarks[idx][0] = kp.position.x;
                    landmarks[idx][1] = kp.position.y;
                }
            }
            // Minimal set for ratio: nose(0), leftEye(2), rightEye(5), leftShoulder(11), rightShoulder(12)
            setPart('nose', 0);
            setPart('leftEye', 2);
            setPart('rightEye', 5);
            setPart('leftShoulder', 11);
            setPart('rightShoulder', 12);
            
            // Calculate posture ratio (same as desktop app)
            const ratioData = calculatePostureRatio(landmarks);
            let newRatioComputed = false;
            
            if (ratioData) {
                postureRatio = ratioData.ratio;
                newRatioComputed = true;
            }
            
            // Handle ratio changes and stuck detection (same as desktop app)
            const now = Date.now();
            const ratioDiff = Math.abs(postureRatio - lastPostureRatio);
            
            if (newRatioComputed) {
                if (ratioDiff < 0.002) {
                    if (ratioStuckStartTime === 0) {
                        ratioStuckStartTime = now;
                    } else if (now - ratioStuckStartTime > 2000 && !isRatioStuck) {
                        isRatioStuck = true;
                    }
                    ratioChangeStreak = 0;
                } else {
                    ratioChangeStreak = Math.min(ratioChangeStreak + 1, 10);
                    if (ratioChangeStreak >= 3) {
                        ratioStuckStartTime = 0;
                        isRatioStuck = false;
                        lastPostureRatio = postureRatio;
                        ratioChangeStreak = 0;
                    }
                }
            }
            
            // Consider person visible if we detect enough landmarks
            isUserVisible = currentPose.length >= 4;
            
            // Calculate score based on calibrated ratio (same as desktop app)
            if (hasSessionStarted && isRatioCalibrated && calibratedRatio > 0) {
                score = calculateRatioScore(postureRatio, calibratedRatio);
            } else {
                score = postureRatio >= 0.98 ? 85 : 30;
            }
            
            // Apply smoothing (same as desktop app)
            if (hasSessionStarted) {
                updateCounter++;
                if (updateCounter % 3 === 0) {
                    const weight = 0.4;
                    smoothedScore = Math.round((score * weight) + (smoothedScore * (1 - weight)));
                    smoothedScore = Math.max(0, Math.min(100, smoothedScore));
                    
                    // Monitor posture score against threshold for audio alerts
                    postureThresholdMonitor.monitorPostureScore(smoothedScore);
                }
            } else {
                smoothedScore = 0;
            }
            
            // Bad posture alert logic (same as desktop app)
            const lowScoreThreshold = 80;
            if (hasSessionStarted && isUserVisible && smoothedScore >= 1 && smoothedScore < lowScoreThreshold) {
                if (lowScoreTicks < 25) {
                    lowScoreTicks++; // accumulate 5s (25 * 200ms)
                } else {
                    beepTick++; // every 2s
                    if (beepTick >= 10) {
                        playBeepSound();
                        beepTick = 0;
                    }
                }
            } else {
                if (lowScoreTicks !== 0 || beepTick !== 0) {
                    lowScoreTicks = 0;
                    beepTick = 0;
                }
            }
            
            // Draw pose landmarks
            if (isTracking && poseCtx) {
                drawPoseLandmarks(pose, poseCtx, poseCanvas);
            } else if (isScanning && scanCtx) {
                drawPoseLandmarks(pose, scanCtx, scanCanvas);
                // Auto-capture logic in scan mode
                if (autoCaptureEnabled) {
                    handleAutoCapture(pose, scanCanvas);
                }
            }
            
            // Update score display with live updates (use smoothed score)
            updateScore(smoothedScore);
            
            // Log ratio for debugging (same as desktop app)
            console.log(`Posture Ratio: ${postureRatio.toFixed(3)}, Calibrated: ${calibratedRatio.toFixed(3)}, Score: ${smoothedScore}, Visible: ${isUserVisible}`);
        }
    }

    // Determine if full body is visible with key landmarks and reasonable bounding box
    function isFullBodyVisible(keypoints, canvas) {
        const requiredParts = [
            'nose', 'leftShoulder', 'rightShoulder', 'leftHip', 'rightHip',
            'leftKnee', 'rightKnee', 'leftAnkle', 'rightAnkle'
        ];
        const present = part => {
            const kp = keypoints.find(k => k.part === part);
            return kp && kp.score > 0.4;
        };
        if (!requiredParts.every(present)) return false;

        // Compute bounding box of reliable points
        const reliable = keypoints.filter(k => k.score > 0.4);
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        reliable.forEach(k => {
            minX = Math.min(minX, k.position.x);
            minY = Math.min(minY, k.position.y);
            maxX = Math.max(maxX, k.position.x);
            maxY = Math.max(maxY, k.position.y);
        });
        const bboxHeight = Math.max(0, maxY - minY);
        const bboxWidth = Math.max(0, maxX - minX);

        // Heuristics: height should cover at least 65% of canvas; width not too small
        const heightOk = bboxHeight >= canvas.height * 0.65;
        const widthOk = bboxWidth >= canvas.width * 0.15;
        // Head above shoulders, ankles below hips
        const nose = keypoints.find(k => k.part === 'nose');
        const leftShoulder = keypoints.find(k => k.part === 'leftShoulder');
        const rightShoulder = keypoints.find(k => k.part === 'rightShoulder');
        const leftAnkle = keypoints.find(k => k.part === 'leftAnkle');
        const rightAnkle = keypoints.find(k => k.part === 'rightAnkle');
        const shoulderY = (leftShoulder.position.y + rightShoulder.position.y) / 2;
        const ankleY = (leftAnkle.position.y + rightAnkle.position.y) / 2;
        const structureOk = (nose.position.y < shoulderY) && (ankleY > shoulderY);

        return heightOk && widthOk && structureOk;
    }

    function handleAutoCapture(pose, canvas) {
        const now = Date.now();
        const full = pose && Array.isArray(pose.keypoints) && isFullBodyVisible(pose.keypoints, canvas);
        if (full) {
            if (fullBodyStableSince === 0) fullBodyStableSince = now;
        } else {
            fullBodyStableSince = 0;
        }

        const stable = fullBodyStableSince && (now - fullBodyStableSince >= FULL_BODY_STABLE_MS);
        const cooledDown = now - lastAutoCaptureAt >= AUTO_CAPTURE_COOLDOWN_MS;
        if (stable && cooledDown) {
            if (autoCaptureStatus) {
                autoCaptureStatus.textContent = 'Auto-capturing...';
            }
            // Trigger capture
            scanCanvas.toBlob(function(blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `posturely-scan-${new Date().getTime()}.png`;
                a.click();
                URL.revokeObjectURL(url);
            }, 'image/png');
            lastAutoCaptureAt = now;
            // Keep scan open but show feedback briefly
            setTimeout(() => { 
                if (autoCaptureStatus) {
                    autoCaptureStatus.textContent = 'Captured ✔'; 
                }
            }, 300);
            setTimeout(() => { 
                if (autoCaptureStatus) {
                    autoCaptureStatus.textContent = ''; 
                }
            }, 1500);
        } else if (full) {
            const remaining = Math.max(0, FULL_BODY_STABLE_MS - (now - fullBodyStableSince));
            if (autoCaptureStatus) {
                autoCaptureStatus.textContent = `Hold steady ${Math.ceil(remaining/1000)}s...`;
            }
        } else {
            if (autoCaptureStatus) {
                autoCaptureStatus.textContent = 'Align full body in frame';
            }
        }
    }
    
    // Calculate real metrics from landmarks (exact same as desktop app)
    function calculateRealMetrics(landmarks) {
        if (landmarks.length < 33) {
            return {
                torsoTilt: 0.0,
                shoulderTilt: 0.0,
                neckFlex: 0.0,
                headZDelta: 0.0,
                shoulderAsymY: 0.0
            };
        }
        
        // Extract key landmarks (using MediaPipe pose landmark indices)
        const nose = landmarks[0];        // Landmark 0: Nose
        const leftShoulder = landmarks[11];  // Landmark 11: Left Shoulder
        const rightShoulder = landmarks[12]; // Landmark 12: Right Shoulder
        const leftHip = landmarks[23];    // Landmark 23: Left Hip
        const rightHip = landmarks[24];   // Landmark 24: Right Hip
        
        // Calculate torso tilt (angle from vertical)
        const torsoCenterX = (leftHip.position.x + rightHip.position.x) / 2;
        const torsoCenterY = (leftHip.position.y + rightHip.position.y) / 2;
        const shoulderCenterX = (leftShoulder.position.x + rightShoulder.position.x) / 2;
        const shoulderCenterY = (leftShoulder.position.y + rightShoulder.position.y) / 2;
        
        const torsoTilt = calculateAngleFromVertical(
            shoulderCenterX, shoulderCenterY,
            torsoCenterX, torsoCenterY
        );
        
        // Calculate shoulder tilt (left vs right shoulder height difference)
        const shoulderTilt = calculateShoulderTilt(leftShoulder, rightShoulder);
        
        // Calculate neck flexion (head forward position)
        const headZDelta = (nose.position.y - shoulderCenterY);
        
        // Calculate neck flexion angle
        const neckFlex = calculateAngleFromVertical(
            nose.position.x, nose.position.y,
            shoulderCenterX, shoulderCenterY
        );
        
        // Shoulder symmetry (height difference)
        const shoulderAsymY = Math.abs((leftShoulder.position.y - rightShoulder.position.y));
        
        return {
            torsoTilt: torsoTilt,
            shoulderTilt: shoulderTilt,
            neckFlex: neckFlex,
            headZDelta: headZDelta,
            shoulderAsymY: shoulderAsymY
        };
    }
    
    // Helper function to calculate angle from vertical
    function calculateAngleFromVertical(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const angle = Math.atan2(dx, dy) * 180.0 / Math.PI;
        return Math.abs(angle);
    }
    
    // Helper function to calculate shoulder tilt
    function calculateShoulderTilt(leftShoulder, rightShoulder) {
        const heightDiff = (leftShoulder.position.y - rightShoulder.position.y);
        return Math.abs(heightDiff) * 100.0; // Scale for better visibility
    }
    
    // Calculate posture score (exact same logic as desktop app)
    function calculatePostureScore(metrics, calibratedThresholds = null) {
        // Use calibrated thresholds if available, otherwise use defaults
        const thresholds = calibratedThresholds || {
            torsoTilt: 10.0,
            shoulderTilt: 7.0,
            neckFlex: 12.0,
            headZDelta: -0.05,
            shoulderAsymY: 0.03
        };
        
        let score = 100;
        const flags = [];
        
        // Apply penalties based on thresholds
        if (metrics.torsoTilt > thresholds.torsoTilt) {
            const penalty = Math.min(((metrics.torsoTilt - thresholds.torsoTilt) / 20.0 * 25), 25.0);
            score -= penalty;
            flags.push("Torso tilt");
        }
        
        if (metrics.shoulderTilt > thresholds.shoulderTilt) {
            const penalty = Math.min(((metrics.shoulderTilt - thresholds.shoulderTilt) / 20.0 * 15), 15.0);
            score -= penalty;
            flags.push("Shoulder tilt");
        }
        
        if (metrics.neckFlex > thresholds.neckFlex) {
            const penalty = Math.min(((metrics.neckFlex - thresholds.neckFlex) / 20.0 * 35), 35.0);
            score -= penalty;
            flags.push("Neck flexion");
        }
        
        if (metrics.headZDelta < thresholds.headZDelta) {
            const penalty = Math.min(((thresholds.headZDelta - metrics.headZDelta) / 0.10 * 45), 45.0);
            score -= penalty;
            flags.push("Forward head");
        }
        
        if (metrics.shoulderAsymY > thresholds.shoulderAsymY) {
            const penalty = Math.min(((metrics.shoulderAsymY - thresholds.shoulderAsymY) / 0.10 * 20), 20.0);
            score -= penalty;
            flags.push("Shoulder asymmetry");
        }
        
        return {
            score: Math.max(0, Math.min(100, Math.round(score))),
            flags: flags
        };
    }
    
    // Calculate posture ratio (exact same as desktop app)
    function calculatePostureRatio(landmarks) {
        try {
            if (landmarks.length < 33) return null;
            
            const nose = landmarks[0];
            const leftEye = landmarks[2];
            const rightEye = landmarks[5];
            const leftShoulder = landmarks[11];
            const rightShoulder = landmarks[12];
            
            const shoulderWidth = Math.sqrt(
                Math.pow(leftShoulder[0] - rightShoulder[0], 2) + 
                Math.pow(leftShoulder[1] - rightShoulder[1], 2)
            );
            
            const faceCenterY = (leftEye[1] + rightEye[1] + nose[1]) / 3.0;
            const shoulderCenterY = (leftShoulder[1] + rightShoulder[1]) / 2.0;
            const faceToShoulder = Math.abs(faceCenterY - shoulderCenterY);
            const ratio = faceToShoulder / shoulderWidth;
            
            return { ratio: ratio };
        } catch (e) {
            return null;
        }
    }
    
    // Calculate ratio score (exact same as desktop app)
    function calculateRatioScore(currentRatio, calibratedRatio) {
        if (calibratedRatio <= 0 || currentRatio <= 0 || isNaN(calibratedRatio) || isNaN(currentRatio)) {
            return 50;
        }
        
        const drop = calibratedRatio - currentRatio;
        if (drop <= 0) return 100;
        
        const score = 100.0 - drop * 200.0;
        return Math.max(0, Math.min(100, Math.round(score)));
    }
    
    // Audio functions
    function initAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }
    
    function playBeepSound() {
        initAudioContext();
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
        
        console.log('🔊 Playing beep sound');
    }
    
    function playCalibrationSequence() {
        initAudioContext();
        
        console.log('🎯 Starting calibration sequence');
        showCountdown = true;
        
        // Show countdown overlay immediately
        countdownOverlay.classList.remove('hidden');
        console.log('🎯 Showing countdown overlay');
        
        // Safety timeout to hide overlay after 5 seconds
        const safetyTimeout = setTimeout(() => {
            console.log('🎯 Safety timeout - hiding countdown overlay');
            hideCountdownOverlay();
        }, 5000);
        
        // Countdown from 3 to 1
        let count = 3;
        const countdownInterval = setInterval(() => {
            countdownValue = count;
            if (countdownValueElement) {
                countdownValueElement.textContent = count;
            }
            
            // Play beep for each countdown number
            if (count > 0) {
                playCountdownBeep();
            }
            
            count--;
            
            if (count < 0) {
                clearInterval(countdownInterval);
                clearTimeout(safetyTimeout);
                showCountdown = false;
                countdownValue = 0;
                console.log('🎯 Hiding countdown overlay');
                
                // Force hide the overlay
                hideCountdownOverlay();
                
                // Start calibration immediately after countdown
                setTimeout(() => {
                    if (postureRatio > 0 && !isNaN(postureRatio)) {
                        calibratedRatio = postureRatio;
                        isRatioCalibrated = true;
                        console.log(`📏 Calibrated ratio: ${calibratedRatio.toFixed(3)}`);
                    } else {
                        // Fallback baseline
                        calibratedRatio = 1.0;
                        isRatioCalibrated = true;
                        console.log('📏 Using fallback calibrated ratio: 1.0');
                    }
                    hasSessionStarted = true;
                    console.log('🎯 Tracking started with live score');
                }, 1000); // Reduced delay to 1 second
            }
        }, 1000);
    }
    
    // Play sit straight audio instruction
    function playSitStraightSound() {
        initAudioContext();
        
        // Create a more complex audio pattern for "sit straight"
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Create a descending tone pattern
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
        oscillator.frequency.setValueAtTime(392, audioContext.currentTime + 0.3); // G4
        oscillator.frequency.setValueAtTime(349, audioContext.currentTime + 0.6); // F4
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.0);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 1.0);
        
        console.log('🎵 Playing sit straight instruction');
    }
    
    // Play countdown beep
    function playCountdownBeep() {
        initAudioContext();
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        
        console.log('🎵 Playing countdown beep');
    }
    
    // Draw pose landmarks on canvas
    function drawPoseLandmarks(pose, ctx, canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (pose.keypoints) {
            const keypoints = pose.keypoints;
            
            // Draw skeleton connections
            const connections = [
                ['leftShoulder', 'rightShoulder'],
                ['leftShoulder', 'leftElbow'],
                ['leftElbow', 'leftWrist'],
                ['rightShoulder', 'rightElbow'],
                ['rightElbow', 'rightWrist'],
                ['leftShoulder', 'leftHip'],
                ['rightShoulder', 'rightHip'],
                ['leftHip', 'rightHip'],
                ['leftHip', 'leftKnee'],
                ['leftKnee', 'leftAnkle'],
                ['rightHip', 'rightKnee'],
                ['rightKnee', 'rightAnkle']
            ];
            
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 2;
            
            connections.forEach(([startPart, endPart]) => {
                const start = keypoints.find(kp => kp.part === startPart);
                const end = keypoints.find(kp => kp.part === endPart);
                
                if (start && end && start.score > 0.5 && end.score > 0.5) {
                    ctx.beginPath();
                    ctx.moveTo(start.position.x, start.position.y);
                    ctx.lineTo(end.position.x, end.position.y);
                    ctx.stroke();
                }
            });
            
            // Draw key points
            ctx.fillStyle = '#FF0000';
            keypoints.forEach((keypoint) => {
                if (keypoint.score > 0.5) {
                    ctx.beginPath();
                    ctx.arc(keypoint.position.x, keypoint.position.y, 3, 0, 2 * Math.PI);
                    ctx.fill();
                }
            });
        }
    }
    
    // Show mood modal before starting tracking
    function showMoodModal() {
        if (moodModal) {
            moodModal.classList.remove('hidden');
            if (moodInput) {
                moodInput.value = '';
                moodInput.focus();
            }
            if (moodCharCount) {
                moodCharCount.textContent = '0';
            }
        }
    }

    // Start camera and tracking (with desktop-style calibration)
    async function startTracking() {
        try {
            // Request camera permission
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });
            
            // Set up video element
            cameraVideo.srcObject = stream;
            cameraVideo.play();
            
            // Set up canvas
            poseCanvas.width = 640;
            poseCanvas.height = 480;
            poseCtx = poseCanvas.getContext('2d');
            
            // Initialize pose detection (don't hard-fail if it errors)
            let poseInitialized = false;
            try {
                poseInitialized = await initializePoseDetection();
            } catch (e) {
                console.error('Pose init exception:', e);
            }
            
            // Show video section
            videoSection.classList.remove('hidden');
            
            // Start pose detection loop
            isTracking = true;
            detectPose();

            // Start tracking session
            await startTrackingSession();
            
            // Start stats timer
            startTrackingTimer();
            
            // Start session timer for display
            startSessionTimer();
            
            // Start posture threshold monitoring
            postureThresholdMonitor.startMonitoring();
            
            // Start AI motivation and summary generation
            aiMotivationManager.startSession();
            
            // Start desktop-style calibration sequence
            isAudioSequencePlaying = true;
            playCalibrationSequence();
            
            // Update storage
            chrome.storage.local.set({ isTracking: true, isScanning: false });
            
            updateUI(true, false);
            
            console.log('Posture tracking started with calibration');
            if (!poseInitialized) {
                if (statusDiv) {
                    statusDiv.textContent = 'Camera on · Pose init failed (tracking disabled)';
                }
                console.warn('Camera started but pose initialization failed. Check TFJS/PoseNet load.');
            }
            
        } catch (error) {
            console.error('Failed to start tracking:', error);
            if (statusDiv) {
                statusDiv.textContent = 'Could not start tracking: ' + (error?.message || 'Unknown error');
            }
        }
    }
    
    // Navigate to dedicated scan page
    function startScan() {
        console.log('🎯 Navigating to dedicated scan page');
        
        // Open scan page in new tab
        const scanUrl = chrome.runtime.getURL('scan.html');
        chrome.tabs.create({ url: scanUrl }, (tab) => {
            console.log('✅ Scan page opened in tab:', tab.id);
        });
    }
    
    // Capture scan (now handled by enhanced scan manager)
    function captureScan() {
        // Enhanced scan manager handles capture automatically
        // This function is kept for compatibility but the enhanced scan
        // manages the entire capture sequence including countdown and multi-view
        console.log('📸 Capture triggered - Enhanced scan manager will handle this');
    }
    
    // Stop scanning
    function stopScan() {
        isScanning = false;
        
        // Cancel enhanced scan if in progress
        if (enhancedScanManager.isScanInProgress()) {
            enhancedScanManager.cancelScan();
        }
        
        // Clean up video stream
        if (scanVideo && scanVideo.srcObject) {
            scanVideo.srcObject.getTracks().forEach(track => track.stop());
            scanVideo.srcObject = null;
        }
        
        scanSection.classList.add('hidden');
        
        // Update storage
        chrome.storage.local.set({ isTracking: false, isScanning: false });
        
        updateUI(false, false);
        
        console.log('Enhanced full body scan stopped');
    }
    
    // Stop tracking
    async function stopTracking() {
        isTracking = false;
        
        if (cameraVideo && cameraVideo.srcObject) {
            cameraVideo.srcObject.getTracks().forEach(track => track.stop());
            cameraVideo.srcObject = null;
        }
        
        videoSection.classList.add('hidden');
        
        // Reset desktop-style state
        hasSessionStarted = false;
        isRatioCalibrated = false;
        calibratedRatio = 0.0;
        postureRatio = 0.0;
        isAudioSequencePlaying = false;
        showCountdown = false;
        countdownValue = 0;
        lowScoreTicks = 0;
        beepTick = 0;
        updateCounter = 0;
        
        // Force hide countdown overlay
        hideCountdownOverlay();
        
        // Update storage
        chrome.storage.local.set({ isTracking: false, isScanning: false });
        
        updateUI(false, false);
        
        console.log('Posture tracking stopped');
        
        // Stop posture threshold monitoring
        postureThresholdMonitor.stopMonitoring();
        
        // Stop AI motivation and summary generation
        aiMotivationManager.stopSession();
        
        // End tracking session
        await endTrackingSession();
        
        stopTrackingTimer();
        stopSessionTimer();
    }
    
    // Pose detection loop
    async function detectPose() {
        if (!isTracking && !isScanning) return;
        
        const video = isTracking ? cameraVideo : scanVideo;
        
        if (video && poseNet && video.readyState === video.HAVE_ENOUGH_DATA) {
            try {
                const pose = await poseNet.estimateSinglePose(video, {
                    flipHorizontal: false,
                    decodingMethod: 'single-person'
                });
                onPoseResults(pose);
            } catch (error) {
                console.error('Pose detection error:', error);
            }
        }
        
        requestAnimationFrame(detectPose);
    }
    
    // Mood modal event listeners
    if (skipMoodBtn) {
        skipMoodBtn.addEventListener('click', () => {
            currentMood = '';
            if (moodModal) moodModal.classList.add('hidden');
            startTracking();
        });
    }

    if (startWithMoodBtn) {
        startWithMoodBtn.addEventListener('click', () => {
            currentMood = moodInput ? moodInput.value.trim() : '';
            if (moodModal) moodModal.classList.add('hidden');
            startTracking();
        });
    }

    // Mood input functionality
    function setupMoodInput() {
        if (!moodInput || !moodCharCount) return;

        // Character count and validation
        moodInput.addEventListener('input', (e) => {
            const value = e.target.value;
            const length = value.length;
            const maxLength = 100;

            // Update character count
            moodCharCount.textContent = length;
            
            // Update character count styling
            moodCharCount.className = 'mood-char-count';
            if (length > maxLength * 0.9) {
                moodCharCount.classList.add('warning');
            }
            if (length >= maxLength) {
                moodCharCount.classList.add('error');
            }

            // Store current mood and update session if active
            currentMood = value.trim();
            
            // Debounced update to avoid too many storage writes
            clearTimeout(moodInput.updateTimeout);
            moodInput.updateTimeout = setTimeout(() => {
                if (currentSessionId) {
                    updateCurrentSessionMood();
                }
            }, 1000); // Update after 1 second of no typing
        });

        // Clear mood input when starting new session
        moodInput.addEventListener('focus', () => {
            if (moodInput.placeholder.includes('e.g.')) {
                moodInput.placeholder = 'How are you feeling right now?';
            }
        });

        // Validate mood input on blur
        moodInput.addEventListener('blur', () => {
            const value = moodInput.value.trim();
            if (value.length > 100) {
                moodInput.value = value.substring(0, 100);
                currentMood = moodInput.value;
                updateMoodCharCount();
            }
        });
    }

    function updateMoodCharCount() {
        if (!moodCharCount || !moodInput) return;
        
        const length = moodInput.value.length;
        moodCharCount.textContent = length;
        
        moodCharCount.className = 'mood-char-count';
        if (length > 90) {
            moodCharCount.classList.add('warning');
        }
        if (length >= 100) {
            moodCharCount.classList.add('error');
        }
    }

    function clearMoodInput() {
        if (moodInput) {
            moodInput.value = '';
            currentMood = '';
            updateMoodCharCount();
        }
    }

    function getMoodData() {
        return {
            mood: currentMood,
            timestamp: new Date().toISOString()
        };
    }

    // Display recent mood data
    async function displayRecentMood() {
        if (!recentMoodBlock || !recentMoodContent) return;

        try {
            const moodData = await dataManager.getDayMoodData();
            
            if (moodData.length === 0) {
                recentMoodBlock.classList.add('hidden');
                return;
            }

            // Get the most recent mood entry
            const recentMood = moodData[moodData.length - 1];
            
            if (!recentMood.mood || !recentMood.mood.trim()) {
                recentMoodBlock.classList.add('hidden');
                return;
            }

            // Format the time
            const moodTime = new Date(recentMood.moodTimestamp || recentMood.startTime);
            const timeString = moodTime.toLocaleTimeString(undefined, { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });

            recentMoodContent.innerHTML = `
                <div>
                    <span class="mood-icon">💭</span>
                    ${recentMood.mood}
                </div>
                <div class="mood-time">from ${timeString}</div>
            `;

            recentMoodBlock.classList.remove('hidden');
        } catch (error) {
            console.error('Failed to display recent mood:', error);
            recentMoodBlock.classList.add('hidden');
        }
    }

    // Event listeners
    startTrackingBtn.addEventListener('click', showMoodModal);
    startScanBtn.addEventListener('click', startScan);
    
    // Guided Exercises Button
    if (guidedExercisesBtn) {
        guidedExercisesBtn.addEventListener('click', () => {
            console.log('🧘‍♀️ Navigating to guided exercises page');
            // Open exercises page in new tab
            chrome.tabs.create({
                url: chrome.runtime.getURL('exercises.html')
            });
        });
    }
    
    stopTrackingBtn.addEventListener('click', stopTracking);
    captureScanBtn.addEventListener('click', captureScan);
    cancelScanBtn.addEventListener('click', stopScan);
    
    // Language selection
    if (languageToggle) {
        languageToggle.addEventListener('click', showLanguageModal);
    }
    
    // Debug translation button
    if (debugTranslation) {
        debugTranslation.addEventListener('click', async () => {
            try {
                console.log('Debug translation clicked');
                
                // Check if translation API is available
                if (typeof Translator === 'undefined') {
                    alert('Chrome Translator API not available. Please use Chrome 127+ with AI features enabled.');
                    return;
                }
                
                // Test Hindi translation
                console.log('Testing Hindi translation...');
                await localizationService.forceTranslateInterface('hi');
                
                // Show success message
                setTimeout(async () => {
                    if (confirm('Interface translated to Hindi! Click OK to restore English.')) {
                        await localizationService.forceTranslateInterface('en');
                    }
                }, 1000);
                
            } catch (error) {
                console.error('Debug translation failed:', error);
                alert(`Translation test failed: ${error.message}`);
            }
        });
    }
    if (closeLanguageModal) {
        closeLanguageModal.addEventListener('click', hideLanguageModal);
    }
    if (languageModal) {
        languageModal.addEventListener('click', (e) => {
            if (e.target === languageModal) {
                hideLanguageModal();
            }
        });
    }

    // Settings modal
    if (settingsToggle) {
        settingsToggle.addEventListener('click', showSettingsModal);
    }
    if (closeSettingsModal) {
        closeSettingsModal.addEventListener('click', hideSettingsModal);
    }
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                hideSettingsModal();
            }
        });
    }
    

    if (autoCaptureToggle) {
        autoCaptureToggle.addEventListener('change', (e) => {
            autoCaptureEnabled = !!e.target.checked;
            fullBodyStableSince = 0;
            lastAutoCaptureAt = 0;
            if (autoCaptureStatus) {
                autoCaptureStatus.textContent = autoCaptureEnabled ? 'Align full body in frame' : '';
            }
        });
    }
    
    function updateUI(tracking, scanning) {
        isTracking = tracking;
        isScanning = scanning;
        
        if (scanning) {
            // Hide ALL content when scanning - only show the scan section
            const header = document.querySelector('.header');
            if (header) header.style.display = 'none';
            
            if (hero) hero.style.display = 'none';
            if (inactiveBlock) inactiveBlock.style.display = 'none';
            scoreDisplay.classList.add('hidden');
            
            // Hide all buttons
            startTrackingBtn.style.display = 'none';
            startScanBtn.style.display = 'none';
            if (guidedExercisesBtn) guidedExercisesBtn.style.display = 'none';
            stopTrackingBtn.style.display = 'none';
            
            // Hide all sections
            if (summaryBlock) summaryBlock.classList.add('hidden');
            if (motivationBlock) motivationBlock.classList.add('hidden');
            if (moodSection) moodSection.classList.add('hidden');
            if (recentMoodBlock) recentMoodBlock.classList.add('hidden');
            if (goalsSection) goalsSection.classList.add('hidden');
            if (badgesSection) badgesSection.classList.add('hidden');
            
            // Hide View Past Data button during scanning
            const viewPastDataBtn = document.getElementById('viewPastDataBtn');
            if (viewPastDataBtn) viewPastDataBtn.style.display = 'none';
            
            // Update toolbar icon for scanning (treated as inactive)
            updateToolbarIcon(false);
        } else if (tracking) {
            // Restore all content visibility for tracking mode
            const header = document.querySelector('.header');
            if (header) header.style.display = 'flex';
            
            if (statusDiv) {
                statusDiv.textContent = 'Posture Tracking: Active';
                statusDiv.className = 'status status-active';
            }
            startTrackingBtn.style.display = 'none';
            startScanBtn.style.display = 'none';
            if (guidedExercisesBtn) guidedExercisesBtn.style.display = 'none';
            stopTrackingBtn.style.display = 'block';
            scoreDisplay.classList.remove('hidden');
            if (hero) hero.style.display = 'none';
            if (inactiveBlock) inactiveBlock.style.display = 'none';
            if (summaryBlock) summaryBlock.classList.remove('hidden');
            if (motivationBlock) motivationBlock.classList.remove('hidden');
            if (timerDisplay) timerDisplay.classList.remove('hidden');
            if (goalsSection) goalsSection.classList.add('hidden'); // Hide goals during tracking
            if (badgesSection) badgesSection.classList.add('hidden'); // Hide achievements during tracking
            
            // Restore View Past Data button after tracking starts
            const viewPastDataBtn = document.getElementById('viewPastDataBtn');
            if (viewPastDataBtn) viewPastDataBtn.style.display = 'block';
            
            displayRecentMood(); // Show recent mood when tracking is active
            updateGoalProgress(); // Show goal progress when tracking is active
            updateBadgeDisplay(); // Show badges when tracking is active
            
            // Update toolbar icon for active tracking
            updateToolbarIcon(true);
        } else {
            // Restore all content visibility for inactive mode
            const header = document.querySelector('.header');
            if (header) header.style.display = 'flex';
            
            if (statusDiv) {
                statusDiv.textContent = 'No active tracking';
                statusDiv.className = 'status status-inactive';
            }
            startTrackingBtn.style.display = 'block';
            startScanBtn.style.display = 'block';
            if (guidedExercisesBtn) guidedExercisesBtn.style.display = 'block';
            stopTrackingBtn.style.display = 'none';
            scoreDisplay.classList.add('hidden');
            if (timerDisplay) timerDisplay.classList.add('hidden');
            if (hero) hero.style.display = 'flex';
            if (inactiveBlock) inactiveBlock.style.display = 'block';
            if (summaryBlock) summaryBlock.classList.add('hidden');
            if (motivationBlock) motivationBlock.classList.add('hidden');
            if (recentMoodBlock) recentMoodBlock.classList.add('hidden');
            if (goalsSection) goalsSection.classList.remove('hidden'); // Always show goals
            if (badgesSection) badgesSection.classList.remove('hidden'); // Always show badges
            
            // Restore View Past Data button when inactive
            const viewPastDataBtn = document.getElementById('viewPastDataBtn');
            if (viewPastDataBtn) viewPastDataBtn.style.display = 'block';
            
            updateGoalProgress(); // Update goal progress when inactive
            updateBadgeDisplay(); // Update badges when inactive
            
            // Update toolbar icon for inactive state
            updateToolbarIcon(false);
        }
        // renderWeekStrip(); // Removed - no longer displaying weekly calendar strip
    }

    // ---------- Session Management ----------
    async function startTrackingSession() {
        if (currentSessionId) return currentSessionId;
        
        sessionStartTime = new Date();
        sessionMinutes = 0;
        
        // Clear mood input for new session
        clearMoodInput();
        
        // Create session record using DataPersistenceManager
        const sessionData = {
            mood: currentMood,
        };
        
        currentSessionId = await dataManager.startSession(sessionData);
        
        // Start break reminder session
        breakReminderManager.startSession();
        
        console.log(`Started tracking session: ${currentSessionId}`);
        return currentSessionId;
    }
    
    async function endTrackingSession() {
        if (!currentSessionId) return null;
        
        const sessionData = {
            minutes: sessionMinutes,
            avgScore: smoothedScore || 0,
            mood: currentMood
        };
        
        const session = await dataManager.endSession(currentSessionId, sessionData);
        console.log(`Ended tracking session: ${currentSessionId}, Duration: ${sessionMinutes} minutes, Mood: ${currentMood || 'none'}`);
        
        // Generate AI summary for the completed session
        try {
            const moodData = currentMood ? { mood: currentMood } : null;
            const aiSummary = await aiManager.generatePostureSummary(sessionData, moodData);
            
            // Translate to user's preferred language
            const translatedSummary = await aiManager.translateToUserLanguage(aiSummary);
            console.log('AI Summary generated and translated:', translatedSummary);
            
            // Update the summary block with AI-generated content
            updateSummaryBlock(translatedSummary);
        } catch (error) {
            console.warn('Failed to generate AI summary:', error);
        }
        
        // Generate motivational message based on session performance
        try {
            const performance = {
                avgScore: sessionData.avgScore,
                minutes: sessionData.minutes
            };
            const motivationalMessage = await aiManager.generateMotivationalMessage(performance, currentMood);
            
            // Translate to user's preferred language
            const translatedMessage = await aiManager.translateToUserLanguage(motivationalMessage);
            console.log('Motivational message generated and translated:', translatedMessage);
            
            // Update the motivation block with AI-generated content
            updateMotivationBlock(translatedMessage);
        } catch (error) {
            console.warn('Failed to generate motivational message:', error);
        }
        
        const completedSessionId = currentSessionId;
        currentSessionId = null;
        sessionStartTime = null;
        sessionMinutes = 0;
        
        // End break reminder session
        breakReminderManager.endSession();
        
        // Clear mood input after session ends
        clearMoodInput();
        
        // Check goals and badges after session ends
        await checkGoalsAndBadges();
        
        return session;
    }

    // Update mood data during active session
    async function updateCurrentSessionMood() {
        if (!currentSessionId) return;
        
        try {
            await dataManager.updateSessionMood(currentSessionId, currentMood);
            console.log(`Updated session mood: ${currentMood}`);
        } catch (error) {
            console.error('Failed to update session mood:', error);
        }
    }

    // ---------- Tracking timer ----------
    function startTrackingTimer() {
        dataManager.startTrackingTimer(async () => {
            if (hasSessionStarted && currentSessionId) {
                sessionMinutes += 1; // Track session minutes
                await addMinutesToToday(1, smoothedScore > 0 ? smoothedScore : null);
                // renderWeekStrip(); // Removed - no longer displaying weekly calendar strip
                
                // Update break reminder system with current posture score
                await breakReminderManager.updatePostureScore(smoothedScore || 0, sessionMinutes);
                
                // Show motivational message every 5 minutes during active tracking
                if (sessionMinutes > 0 && sessionMinutes % 5 === 0) {
                    try {
                        const performance = {
                            avgScore: smoothedScore || 0,
                            minutes: sessionMinutes
                        };
                        const motivationalMessage = await aiManager.generateMotivationalMessage(performance, currentMood);
                        const translatedMessage = await aiManager.translateToUserLanguage(motivationalMessage);
                        updateMotivationBlock(translatedMessage);
                    } catch (error) {
                        console.warn('Failed to generate periodic motivational message:', error);
                    }
                }
            }
        });
    }
    
    async function stopTrackingTimer() {
        await dataManager.stopTrackingTimer();
        console.log('Final data flush completed');
    }

    // ---------- Session Timer Functions ----------
    function startSessionTimer() {
        sessionStartTimestamp = Date.now();
        updateTimerDisplay();
        
        sessionTimerInterval = setInterval(() => {
            updateTimerDisplay();
        }, 1000); // Update every second
    }

    function stopSessionTimer() {
        if (sessionTimerInterval) {
            clearInterval(sessionTimerInterval);
            sessionTimerInterval = null;
        }
        sessionStartTimestamp = null;
        if (timerValue) {
            timerValue.textContent = '00:00';
        }
    }

    function updateTimerDisplay() {
        if (!sessionStartTimestamp || !timerValue) return;
        
        const elapsed = Math.floor((Date.now() - sessionStartTimestamp) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        timerValue.textContent = formattedTime;
    }



    if (viewPastDataBtn) viewPastDataBtn.addEventListener('click', () => {
        // Open analytics dashboard in a new tab
        chrome.tabs.create({
            url: chrome.runtime.getURL('analytics.html')
        });
    });

    // View Achievements Button
    const viewAchievementsBtn = document.getElementById('viewAchievementsBtn');
    if (viewAchievementsBtn) {
        viewAchievementsBtn.addEventListener('click', () => {
            // Open achievements page in a new tab
            chrome.tabs.create({
                url: chrome.runtime.getURL('achievements.html')
            });
        });
    }


    // Enhanced Language selection functions
    async function showLanguageModal() {
        if (!languageModal) return;
        
        await populateEnhancedLanguageList();
        languageModal.classList.remove('hidden');
    }
    
    function hideLanguageModal() {
        if (!languageModal) return;
        
        languageModal.classList.add('hidden');
        hideDownloadProgress();
    }
    
    async function populateEnhancedLanguageList() {
        if (!languageList) return;
        
        const languages = enhancedLanguageManager.getAllSupportedLanguages();
        const isAPIAvailable = enhancedLanguageManager.isTranslatorAPIAvailable();
        
        languageList.innerHTML = '';
        
        // Add header with stats
        const headerItem = document.createElement('div');
        headerItem.className = 'language-header';
        const stats = enhancedLanguageManager.getLanguageStats();
        headerItem.innerHTML = `
            <div class="language-stats">
                <span class="stats-text">${stats.downloaded}/${stats.total} languages available</span>
                ${!isAPIAvailable ? '<span class="api-warning">⚠️ Chrome AI required for translations</span>' : ''}
            </div>
        `;
        languageList.appendChild(headerItem);
        
        // Add languages
        for (const language of languages) {
            const item = document.createElement('div');
            item.className = `language-item ${language.isActive ? 'selected' : ''}`;
            
            // Add status-specific styling
            const status = language.status;
            if (status === 'error') {
                item.classList.add('language-error');
            } else if (status === 'downloading') {
                item.classList.add('language-downloading');
            }
            
            const statusText = enhancedLanguageManager.getStatusText(language.code);
            const statusColor = enhancedLanguageManager.getStatusColor(language.code);
            
            item.innerHTML = `
                <div class="language-info">
                    <span class="language-flag">${language.flag}</span>
                    <span class="language-name">${language.name}</span>
                </div>
                <div class="language-status-container">
                    <span class="language-status" style="color: ${statusColor}">${statusText}</span>
                    ${status === 'error' ? '<button class="retry-btn" data-lang="' + language.code + '">↻</button>' : ''}
                    ${status === 'downloading' ? '<div class="download-spinner">⟳</div>' : ''}
                </div>
            `;
            
            // Add click handler
            if (enhancedLanguageManager.canSelectLanguage(language.code) || status === 'available') {
                item.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('retry-btn')) {
                        selectEnhancedLanguage(language.code, language.name);
                    }
                });
                item.style.cursor = 'pointer';
            } else {
                item.style.opacity = '0.6';
                item.style.cursor = 'not-allowed';
            }
            
            // Add retry button handler
            const retryBtn = item.querySelector('.retry-btn');
            if (retryBtn) {
                retryBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    retryLanguageDownload(language.code, language.name);
                });
            }
            
            languageList.appendChild(item);
        }
    }
    
    async function selectEnhancedLanguage(languageCode, languageName) {
        try {
            // Check if language can be selected immediately
            if (enhancedLanguageManager.canSelectLanguage(languageCode)) {
                await enhancedLanguageManager.switchExtensionLanguage(languageCode);
                
                // Manually trigger interface translation as backup
                await localizationService.translateCurrentInterface();
                
                await populateEnhancedLanguageList();
                console.log(`Language changed to: ${languageName}`);
                return;
            }
            
            // Check if translator API is available for non-English languages
            if (languageCode !== 'en' && !enhancedLanguageManager.isTranslatorAPIAvailable()) {
                showLanguageError(`Translation features are not available in your current Chrome version.\n\nYou need Chrome 138+ with built-in AI Translator API enabled.\nCurrently only English is supported.`);
                return;
            }
            
            // Need to download the model
            showDownloadProgress(languageName);
            
            try {
                await enhancedLanguageManager.downloadLanguageModel(languageCode, (progress) => {
                    updateDownloadProgress(progress);
                });
                
                // Switch to the language after successful download
                await enhancedLanguageManager.switchExtensionLanguage(languageCode);
                
                // Manually trigger interface translation as backup
                await localizationService.translateCurrentInterface();
                
                // Update UI
                await populateEnhancedLanguageList();
                hideDownloadProgress();
                
                // Show success message
                showDownloadSuccess(languageName);
                
                console.log(`Language downloaded and changed to: ${languageName}`);
                
            } catch (downloadError) {
                hideDownloadProgress();
                console.error('Failed to download model:', downloadError);
                
                // Update UI to show error state
                await populateEnhancedLanguageList();
                
                showLanguageError(`Failed to download ${languageName}: ${downloadError.message}`);
            }
            
        } catch (error) {
            console.error('Failed to select language:', error);
            hideDownloadProgress();
            
            showLanguageError(`Failed to select ${languageName}: ${error.message}`);
        }
    }
    
    async function retryLanguageDownload(languageCode, languageName) {
        try {
            showDownloadProgress(languageName);
            
            await enhancedLanguageManager.retryDownload(languageCode, (progress) => {
                updateDownloadProgress(progress);
            });
            
            await enhancedLanguageManager.switchExtensionLanguage(languageCode);
            
            // Manually trigger interface translation as backup
            await localizationService.translateCurrentInterface();
            
            await populateEnhancedLanguageList();
            hideDownloadProgress();
            
            // Show success message
            showDownloadSuccess(languageName);
            
            console.log(`Language retry successful for: ${languageName}`);
            
        } catch (error) {
            console.error('Retry failed:', error);
            hideDownloadProgress();
            await populateEnhancedLanguageList();
            showLanguageError(`Retry failed for ${languageName}: ${error.message}`);
        }
    }
    
    function showLanguageError(message) {
        // Create a temporary error display
        const errorDiv = document.createElement('div');
        errorDiv.className = 'language-error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #EF4444;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1001;
            max-width: 300px;
            font-size: 14px;
        `;
        
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
    
    let downloadStartTime = 0;
    let currentDownloadLanguage = null;
    
    function showDownloadProgress(languageName) {
        if (!downloadProgress) return;
        
        // Find language details for flag
        const languages = enhancedLanguageManager.getAllSupportedLanguages();
        const language = languages.find(l => l.name === languageName);
        
        currentDownloadLanguage = language?.code || 'en';
        downloadStartTime = Date.now();
        
        // Update UI elements
        const downloadLanguageFlag = document.getElementById('downloadLanguageFlag');
        const downloadLanguageName = document.getElementById('downloadLanguageName');
        const downloadPercentage = document.getElementById('downloadPercentage');
        const progressFill = document.getElementById('progressFill');
        const progressSize = document.getElementById('progressSize');
        const progressSpeed = document.getElementById('progressSpeed');
        const progressCancel = document.getElementById('progressCancel');
        
        if (downloadLanguageFlag) downloadLanguageFlag.textContent = language?.flag || '🌐';
        if (downloadLanguageName) downloadLanguageName.textContent = `Downloading ${languageName}`;
        if (downloadPercentage) downloadPercentage.textContent = '0%';
        if (progressFill) progressFill.style.width = '0%';
        if (progressSize) progressSize.textContent = `Size: ${language?.size || 'Unknown'}MB`;
        if (progressSpeed) progressSpeed.textContent = '';
        
        // Show cancel button
        if (progressCancel) {
            progressCancel.classList.remove('hidden');
            progressCancel.onclick = () => cancelDownload();
        }
        
        downloadProgress.classList.remove('hidden');
    }
    
    function updateDownloadProgress(progress) {
        if (!downloadProgress) return;
        
        const percentage = Math.round(progress);
        const downloadPercentage = document.getElementById('downloadPercentage');
        const progressFill = document.getElementById('progressFill');
        const progressSpeed = document.getElementById('progressSpeed');
        
        if (downloadPercentage) downloadPercentage.textContent = `${percentage}%`;
        if (progressFill) progressFill.style.width = `${percentage}%`;
        
        // Calculate download speed
        if (downloadStartTime && progressSpeed) {
            const elapsed = (Date.now() - downloadStartTime) / 1000; // seconds
            if (elapsed > 1 && percentage > 0) {
                const speed = (percentage / elapsed).toFixed(1);
                progressSpeed.textContent = `${speed}%/sec`;
            }
        }
        
        // Update progress status
        const progressSpinner = document.getElementById('progressSpinner');
        if (progressSpinner) {
            if (percentage >= 100) {
                progressSpinner.textContent = '✓';
                progressSpinner.style.animation = 'none';
                progressSpinner.style.color = '#34C759';
            }
        }
        
        // Hide cancel button when complete
        if (percentage >= 100) {
            const progressCancel = document.getElementById('progressCancel');
            if (progressCancel) progressCancel.classList.add('hidden');
        }
    }
    
    function hideDownloadProgress() {
        if (!downloadProgress) return;
        
        downloadProgress.classList.add('hidden');
        
        // Reset state
        currentDownloadLanguage = null;
        downloadStartTime = 0;
        
        // Reset UI elements
        const progressSpinner = document.getElementById('progressSpinner');
        const progressCancel = document.getElementById('progressCancel');
        
        if (progressSpinner) {
            progressSpinner.textContent = '⟳';
            progressSpinner.style.animation = 'spin 1s linear infinite';
            progressSpinner.style.color = '';
        }
        
        if (progressCancel) {
            progressCancel.classList.add('hidden');
            progressCancel.onclick = null;
        }
    }
    
    function cancelDownload() {
        if (currentDownloadLanguage) {
            console.log(`Cancelling download for ${currentDownloadLanguage}`);
            // Note: The Chrome AI API doesn't support cancellation, but we can hide the UI
            hideDownloadProgress();
            showLanguageError('Download cancelled by user');
        }
    }
    
    function showDownloadSuccess(languageName) {
        // Show success message
        const successDiv = document.createElement('div');
        successDiv.className = 'download-success-message';
        successDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: #34C759; font-size: 16px;">✓</span>
                <span>${languageName} downloaded successfully!</span>
            </div>
        `;
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #34C759;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1001;
            font-size: 14px;
            font-weight: 500;
        `;
        
        document.body.appendChild(successDiv);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }

    // Initialize mood input functionality
    setupMoodInput();

    // Initial paint and data migration
    dataManager.validateAndMigrateData().then(() => {
        // renderWeekStrip(); // Removed - no longer displaying weekly calendar strip
        displayRecentMood(); // Show recent mood data on load
        updateGoalProgress(); // Show goal progress on load
        updateBadgeDisplay(); // Show badges on load
    });
    
    // Update summary block with AI-generated content
    function updateSummaryBlock(summaryText) {
        if (summaryBlock) {
            const summaryContent = summaryBlock.querySelector('.summary-content') || summaryBlock;
            summaryContent.textContent = summaryText;
            summaryBlock.classList.remove('hidden');
            
            // Auto-hide after 10 seconds
            setTimeout(() => {
                if (summaryBlock) {
                    summaryBlock.classList.add('hidden');
                }
            }, 10000);
        }
    }
    
    // Update motivation block with AI-generated content
    function updateMotivationBlock(motivationText) {
        if (motivationBlock) {
            const motivationContent = motivationBlock.querySelector('.motivation-content') || motivationBlock;
            motivationContent.textContent = motivationText;
            motivationBlock.classList.remove('hidden');
            
            // Auto-hide after 8 seconds
            setTimeout(() => {
                if (motivationBlock) {
                    motivationBlock.classList.add('hidden');
                }
            }, 8000);
        }
    }
    
    function updateScore(currentScore) {
        if (scoreValue) {
            scoreValue.textContent = currentScore;
            
            // Update score color and status (same as desktop app)
            scoreValue.className = 'score-value ';
            if (currentScore >= 80) {
                scoreValue.className += 'score-good';
            } else if (currentScore >= 60) {
                scoreValue.className += 'score-fair';
            } else {
                scoreValue.className += 'score-poor';
            }
        }
        
        if (scoreStatus) {
            if (currentScore >= 80) {
                scoreStatus.textContent = 'GOOD ✓';
            } else if (currentScore >= 60) {
                scoreStatus.textContent = 'OK';
            } else {
                scoreStatus.textContent = 'BAD ⚠️';
            }
        }
        
        // Add visual feedback for live updates
        if (scoreValue) {
            scoreValue.style.transform = 'scale(1.1)';
            setTimeout(() => {
                if (scoreValue) {
                    scoreValue.style.transform = 'scale(1.0)';
                }
            }, 150);
        }
        
        // Toolbar icon is already updated in updateUI function
    }

    // Toolbar icon management
    function updateToolbarIcon(trackingState) {
        // Send message to background script to update icon
        chrome.runtime.sendMessage({
            type: 'updateIcon',
            data: {
                isTracking: trackingState
            }
        }).then(response => {
            if (response && response.success) {
                console.log(`Toolbar icon updated: tracking=${trackingState}`);
            }
        }).catch(error => {
            console.warn('Failed to update toolbar icon:', error);
        });
    }

    // Initialize toolbar icon state on page load
    function initializeToolbarIcon() {
        chrome.storage.local.get(['isTracking'], (result) => {
            const isTracking = result.isTracking || false;
            updateToolbarIcon(isTracking);
        });
    }

    // Settings modal functions
    async function showSettingsModal() {
        if (!settingsModal) return;
        
        await loadBreakReminderSettings();
        await updateBreakReminderStats();
        settingsModal.classList.remove('hidden');
    }
    
    function hideSettingsModal() {
        if (!settingsModal) return;
        settingsModal.classList.add('hidden');
    }

    async function loadBreakReminderSettings() {
        const status = breakReminderManager.getStatus();
        
        if (breakRemindersEnabled) {
            breakRemindersEnabled.checked = status.isEnabled;
        }
        
        if (reminderFrequency) {
            reminderFrequency.value = status.frequency;
            updateFrequencyDisplay(status.frequency);
        }
        
        if (postureThreshold) {
            postureThreshold.value = status.threshold;
            updateThresholdDisplay(status.threshold);
        }
        
        // Load audio alert settings
        await loadAudioAlertSettings();
    }

    async function loadAudioAlertSettings() {
        const audioStatus = audioAlertService.getStatus();
        const thresholdStatus = postureThresholdMonitor.getStatus();
        
        if (audioAlertsEnabled) {
            audioAlertsEnabled.checked = thresholdStatus.isEnabled;
        }
        
        if (alertVolume) {
            alertVolume.value = Math.round(audioStatus.volume * 100);
            updateAlertVolumeDisplay(Math.round(audioStatus.volume * 100));
        }
        
        if (alertType) {
            alertType.value = audioStatus.type;
        }
    }

    function updateFrequencyDisplay(value) {
        if (frequencyValue) {
            frequencyValue.textContent = `${value} min`;
        }
    }

    function updateThresholdDisplay(value) {
        if (thresholdValue) {
            thresholdValue.textContent = value;
        }
    }

    function updateAlertVolumeDisplay(value) {
        if (alertVolumeValue) {
            alertVolumeValue.textContent = `${value}%`;
        }
    }

    async function updateBreakReminderStats() {
        try {
            const stats = await breakReminderManager.getBreakReminderStats();
            
            if (totalReminders) {
                totalReminders.textContent = stats.totalReminders;
            }
            if (acceptedBreaks) {
                acceptedBreaks.textContent = stats.acceptedBreaks;
            }
            if (acceptanceRate) {
                acceptanceRate.textContent = `${stats.acceptanceRate}%`;
            }
        } catch (error) {
            console.error('Failed to load break reminder stats:', error);
        }
    }

    // Settings event listeners
    if (breakRemindersEnabled) {
        breakRemindersEnabled.addEventListener('change', async (e) => {
            await breakReminderManager.updatePreferences({
                enabled: e.target.checked
            });
        });
    }

    if (reminderFrequency) {
        reminderFrequency.addEventListener('input', (e) => {
            updateFrequencyDisplay(e.target.value);
        });
        
        reminderFrequency.addEventListener('change', async (e) => {
            await breakReminderManager.updatePreferences({
                frequency: parseInt(e.target.value)
            });
        });
    }

    if (postureThreshold) {
        postureThreshold.addEventListener('input', (e) => {
            updateThresholdDisplay(e.target.value);
        });
        
        postureThreshold.addEventListener('change', async (e) => {
            const threshold = parseInt(e.target.value);
            await breakReminderManager.updatePreferences({
                threshold: threshold
            });
            // Also update the posture threshold monitor
            await postureThresholdMonitor.setThreshold(threshold);
        });
    }

    // Audio alert settings event listeners
    if (audioAlertsEnabled) {
        audioAlertsEnabled.addEventListener('change', async (e) => {
            await postureThresholdMonitor.setAudioEnabled(e.target.checked);
            await audioAlertService.setEnabled(e.target.checked);
        });
    }

    if (alertVolume) {
        alertVolume.addEventListener('input', (e) => {
            updateAlertVolumeDisplay(e.target.value);
        });
        
        alertVolume.addEventListener('change', async (e) => {
            const volume = parseInt(e.target.value) / 100; // Convert to 0-1 range
            await audioAlertService.setVolume(volume);
        });
    }

    if (alertType) {
        alertType.addEventListener('change', async (e) => {
            await audioAlertService.setAlertType(e.target.value);
        });
    }

    if (testAudioAlert) {
        testAudioAlert.addEventListener('click', () => {
            audioAlertService.testAlert();
        });
    }

    // ---------- Goal Tracking Functions ----------
    async function updateGoalProgress() {
        if (!goalProgress || !streakNumber) return;

        try {
            const stats = await dataManager.getStats();
            const progress = await goalTracker.getTodayProgress(stats);
            
            // Update goal progress display
            goalProgress.innerHTML = `
                <div class="goal-item">
                    <div class="goal-label">Daily Minutes</div>
                    <div class="goal-value">${progress.progress.minutes.current}/${progress.progress.minutes.target} min</div>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: ${progress.progress.minutes.percentage}%"></div>
                </div>
                <div class="goal-item">
                    <div class="goal-label">Posture Score</div>
                    <div class="goal-value">${progress.progress.posture.current}/${progress.progress.posture.target}</div>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: ${progress.progress.posture.percentage}%"></div>
                </div>
            `;

            // Update streak display
            streakNumber.textContent = `${progress.streak.currentStreak} days`;
            
            // Update streak in storage and check for achievements
            await goalTracker.updateStreak(stats);
            
        } catch (error) {
            console.error('Failed to update goal progress:', error);
        }
    }

    async function updateBadgeDisplay() {
        if (!badgesCount || !recentBadges) return;

        try {
            const stats = await dataManager.getStats();
            const streakData = await goalTracker.getStreakData();
            
            // Use comprehensive achievement manager for display
            await comprehensiveAchievementManager.updateBadgeDisplayComprehensive(badgesCount, recentBadges);
            
            // Still check for new badge achievements using the original system
            await badgeSystem.checkAndAwardBadges(stats, streakData);
            
        } catch (error) {
            console.error('Failed to update badge display:', error);
        }
    }

    // Goals modal functions
    async function showGoalsModal() {
        if (!goalsModal) return;
        
        await loadGoalSettings();
        goalsModal.classList.remove('hidden');
    }
    
    function hideGoalsModal() {
        if (!goalsModal) return;
        goalsModal.classList.add('hidden');
    }

    async function loadGoalSettings() {
        const goals = await goalTracker.getGoals();
        
        if (dailyMinutesSlider) {
            dailyMinutesSlider.value = goals.dailyMinutes;
            updateDailyMinutesDisplay(goals.dailyMinutes);
        }
        
        if (postureScoreSlider) {
            postureScoreSlider.value = goals.postureScore;
            updatePostureScoreDisplay(goals.postureScore);
        }
        
        if (streakGoalSlider) {
            streakGoalSlider.value = goals.streakDays;
            updateStreakGoalDisplay(goals.streakDays);
        }
    }

    function updateDailyMinutesDisplay(value) {
        if (dailyMinutesValue) {
            const hours = Math.floor(value / 60);
            const minutes = value % 60;
            if (hours > 0) {
                dailyMinutesValue.textContent = `${hours}h ${minutes}m`;
            } else {
                dailyMinutesValue.textContent = `${minutes} min`;
            }
        }
    }

    function updatePostureScoreDisplay(value) {
        if (postureScoreValue) {
            postureScoreValue.textContent = value;
        }
    }

    function updateStreakGoalDisplay(value) {
        if (streakGoalValue) {
            streakGoalValue.textContent = `${value} days`;
        }
    }

    // Goal settings event listeners
    if (goalsSettingsBtn) {
        goalsSettingsBtn.addEventListener('click', showGoalsModal);
    }
    if (closeGoalsModal) {
        closeGoalsModal.addEventListener('click', hideGoalsModal);
    }
    if (goalsModal) {
        goalsModal.addEventListener('click', (e) => {
            if (e.target === goalsModal) {
                hideGoalsModal();
            }
        });
    }

    if (dailyMinutesSlider) {
        dailyMinutesSlider.addEventListener('input', (e) => {
            updateDailyMinutesDisplay(parseInt(e.target.value));
        });
        
        dailyMinutesSlider.addEventListener('change', async (e) => {
            await goalTracker.setGoals({
                dailyMinutes: parseInt(e.target.value)
            });
            updateGoalProgress();
        });
    }

    if (postureScoreSlider) {
        postureScoreSlider.addEventListener('input', (e) => {
            updatePostureScoreDisplay(parseInt(e.target.value));
        });
        
        postureScoreSlider.addEventListener('change', async (e) => {
            await goalTracker.setGoals({
                postureScore: parseInt(e.target.value)
            });
            updateGoalProgress();
        });
    }

    if (streakGoalSlider) {
        streakGoalSlider.addEventListener('input', (e) => {
            updateStreakGoalDisplay(parseInt(e.target.value));
        });
        
        streakGoalSlider.addEventListener('change', async (e) => {
            await goalTracker.setGoals({
                streakDays: parseInt(e.target.value)
            });
        });
    }

    // Update goal progress and badges when session ends
    async function checkGoalsAndBadges() {
        try {
            const stats = await dataManager.getStats();
            const streakData = await goalTracker.getStreakData();
            
            // Update streak and check achievements
            await goalTracker.updateStreak(stats);
            
            // Check for new badges
            const sessionData = currentSessionId ? {
                startTime: sessionStartTime?.toISOString(),
                minutes: sessionMinutes,
                mood: currentMood
            } : null;
            
            await badgeSystem.checkAndAwardBadges(stats, streakData, sessionData);
            
            // Update displays
            await updateGoalProgress();
            await updateBadgeDisplay();
            
        } catch (error) {
            console.error('Failed to check goals and badges:', error);
        }
    }
    
    // ---------- Origin Trial Status Functions ----------
    async function checkAndDisplayOriginTrialStatus() {
        try {
            const status = await aiManager.getOriginTrialStatus();
            displayOriginTrialStatus(status);
        } catch (error) {
            console.error('Failed to check Origin Trial status:', error);
            displayOriginTrialStatus({
                status: 'error',
                message: 'Unable to check Chrome AI status',
                setupRequired: true,
                canUseAI: false
            });
        }
    }

    function displayOriginTrialStatus(status) {
        const originTrialStatus = document.getElementById('originTrialStatus');
        const originTrialText = document.getElementById('originTrialText');
        const originTrialDetails = document.getElementById('originTrialDetails');
        const originTrialLink = document.getElementById('originTrialLink');
        const setupGuideBtn = document.getElementById('setupGuideBtn');
        const recheckAIBtn = document.getElementById('recheckAIBtn');

        if (!originTrialStatus || !originTrialText) return;

        // Check if user has dismissed AI setup notifications
        chrome.storage.local.get(['aiSetupDismissed'], (result) => {
            const isDismissed = result.aiSetupDismissed || false;
            
            // Update the main message
            originTrialText.textContent = status.message;

            // Only show setup message if:
            // 1. Setup is required AND
            // 2. User hasn't dismissed it AND  
            // 3. Status is critical (not just missing optional features)
            const shouldShow = status.setupRequired && 
                              !isDismissed && 
                              (status.status === 'not_configured' || status.status === 'error');

            if (shouldShow) {
                originTrialStatus.classList.remove('hidden');
                
                // Update icon based on status
                const icon = originTrialStatus.querySelector('.origin-trial-icon');
                if (icon) {
                    switch (status.status) {
                        case 'not_configured':
                            icon.textContent = '💡'; // Less alarming icon
                            break;
                        case 'apis_unavailable':
                            icon.textContent = '❌';
                            break;
                        case 'error':
                            icon.textContent = '⚠️';
                            break;
                        default:
                            icon.textContent = '💡';
                    }
                }

                // Show details if needed
                if (originTrialDetails) {
                    originTrialDetails.classList.remove('hidden');
                }
            } else {
                // Hide the status block
                originTrialStatus.classList.add('hidden');
            }
        });

        // Set up event listeners
        if (originTrialLink) {
            originTrialLink.href = 'https://docs.google.com/forms/d/e/1FAIpQLSfZXeiwj9KO9jMctffHPym88ln12xNWCrVkMY_u06WfSTulQg/viewform';
        }

        if (setupGuideBtn) {
            setupGuideBtn.onclick = () => {
                // Open the setup guide
                chrome.tabs.create({
                    url: chrome.runtime.getURL('CHROME_AI_SETUP.md')
                });
            };
        }

        if (recheckAIBtn) {
            recheckAIBtn.onclick = async () => {
                recheckAIBtn.textContent = '🔄 Checking...';
                recheckAIBtn.disabled = true;
                
                try {
                    // Re-initialize AI services
                    await aiManager.initialize();
                    await checkAndDisplayOriginTrialStatus();
                } catch (error) {
                    console.error('Recheck failed:', error);
                } finally {
                    recheckAIBtn.textContent = '🔄 Recheck';
                    recheckAIBtn.disabled = false;
                }
            };
        }

        // Add dismiss functionality
        const dismissAISetupBtn = document.getElementById('dismissAISetupBtn');
        if (dismissAISetupBtn) {
            dismissAISetupBtn.onclick = () => {
                chrome.storage.local.set({ aiSetupDismissed: true }, () => {
                    originTrialStatus.classList.add('hidden');
                    console.log('AI setup notification dismissed by user');
                });
            };
        }

        // Add AI test functionality
        const testAIBtn = document.getElementById('testAIBtn');
        if (testAIBtn) {
            testAIBtn.onclick = async () => {
                testAIBtn.textContent = '🔄 Testing...';
                testAIBtn.disabled = true;
                
                try {
                    await testAIFunctionality();
                } catch (error) {
                    console.error('AI test failed:', error);
                } finally {
                    testAIBtn.textContent = '🧪 Test AI';
                    testAIBtn.disabled = false;
                }
            };
        }
    }

    // Add periodic Origin Trial status checking (every 30 seconds)
    setInterval(async () => {
        try {
            const status = await aiManager.getOriginTrialStatus();
            // Only update display if status changed significantly
            const currentStatus = document.getElementById('originTrialStatus');
            const isCurrentlyHidden = currentStatus?.classList.contains('hidden');
            const shouldBeHidden = !status.setupRequired;
            
            if (isCurrentlyHidden !== shouldBeHidden) {
                displayOriginTrialStatus(status);
            }
        } catch (error) {
            // Silently fail periodic checks
            console.warn('Periodic Origin Trial check failed:', error);
        }
    }, 30000);

    // ---------- AI Testing Functions ----------
    async function testAIFunctionality() {
        const aiTestResults = document.getElementById('aiTestResults');
        const aiTestContent = document.getElementById('aiTestContent');
        
        if (!aiTestResults || !aiTestContent) return;
        
        // Show test results section
        aiTestResults.classList.remove('hidden');
        aiTestContent.innerHTML = '<div class="test-item">🔄 Running AI tests...</div>';
        
        const results = [];
        
        try {
            // Test 1: Check AI availability
            results.push('<div class="test-item test-success">✅ Starting AI functionality test</div>');
            
            const status = await aiManager.getOriginTrialStatus();
            results.push(`<div class="test-item ${status.canUseAI ? 'test-success' : 'test-warning'}">
                ${status.canUseAI ? '✅' : '⚠️'} AI Status: ${status.message}
            </div>`);
            
            // Test 2: Test Summarizer API directly (following official demo pattern)
            if ('Summarizer' in self) {
                try {
                    const availability = await self.Summarizer.availability();
                    results.push(`<div class="test-item test-success">✅ Summarizer availability: ${availability}</div>`);
                    
                    // Use official demo availability values
                    if (availability === 'readily' || availability === 'after-download' || 
                        availability === 'available' || availability === 'downloadable') {
                        // Test session creation (following official demo pattern)
                        const session = await self.Summarizer.create({
                            type: 'tldr',
                            format: 'plain-text',
                            length: 'medium'
                            // Note: No outputLanguage - official demo doesn't use it
                        });
                        results.push('<div class="test-item test-success">✅ Summarizer session created successfully</div>');
                        
                        // Test actual summarization
                        const testText = "This is a test of the Chrome AI Summarizer API. The Posturely extension uses AI to generate intelligent summaries of your posture tracking sessions. This helps you understand your posture patterns and get personalized insights about your sitting habits throughout the day.";
                        const summary = await session.summarize(testText);
                        
                        session.destroy();
                        
                        results.push('<div class="test-item test-success">✅ Summarization test completed</div>');
                        results.push(`<div class="test-summary">
                            <strong>📝 Test Summary Result:</strong><br>
                            "${summary}"
                        </div>`);
                    } else {
                        results.push(`<div class="test-item test-warning">⚠️ Summarizer not ready: ${availability}</div>`);
                    }
                } catch (summarizerError) {
                    results.push(`<div class="test-item test-error">❌ Summarizer test failed: ${summarizerError.message}</div>`);
                }
            } else {
                results.push('<div class="test-item test-error">❌ Summarizer API not available in browser</div>');
            }
            
            // Test 3: Test AIServicesManager integration
            try {
                const testSessionData = {
                    minutes: 45,
                    avgScore: 78,
                    samples: 150
                };
                
                const testMoodData = {
                    mood: 'focused and productive'
                };
                
                const summary = await aiManager.generatePostureSummary(testSessionData, testMoodData);
                results.push('<div class="test-item test-success">✅ AIServicesManager integration test passed</div>');
                results.push(`<div class="test-summary">
                    <strong>🎯 Integration Test Result:</strong><br>
                    "${summary}"
                </div>`);
            } catch (integrationError) {
                results.push(`<div class="test-item test-warning">⚠️ AIServicesManager test: ${integrationError.message}</div>`);
                results.push('<div class="test-item">ℹ️ This is expected if AI APIs are not configured - fallback content will be used</div>');
            }
            
        } catch (error) {
            results.push(`<div class="test-item test-error">❌ Test failed: ${error.message}</div>`);
        }
        
        // Update results
        aiTestContent.innerHTML = results.join('');
        
        // Auto-hide after 30 seconds
        setTimeout(() => {
            if (aiTestResults) {
                aiTestResults.classList.add('hidden');
            }
        }, 30000);
    }

    // Main button event listeners
    if (startTrackingBtn) {
        startTrackingBtn.addEventListener('click', showMoodModal);
    }
    
    if (startScanBtn) {
        startScanBtn.addEventListener('click', startScan);
    }
    
    if (stopTrackingBtn) {
        stopTrackingBtn.addEventListener('click', stopTracking);
    }
    
    if (captureScanBtn) {
        captureScanBtn.addEventListener('click', captureScan);
    }
    
    if (cancelScanBtn) {
        cancelScanBtn.addEventListener('click', stopScan);
    }



    console.log('Posturely side panel loaded');
});