# Design Document

## Overview

This design document outlines the architecture for implementing a comprehensive full body scan and guided exercise system for the Posturely Chrome extension. The system will provide dedicated pages for scanning and exercises, integrate Chrome's built-in AI for report generation, and implement three guided exercises with audio instruction and real-time pose tracking.

The design builds upon the existing MediaPipe integration while adding new dedicated interfaces, AI-powered reporting, and sophisticated exercise tracking capabilities.

## Architecture

### Current Architecture Integration
The enhanced system will integrate with existing components:
- **MediaPipe Pose Detection** - Leveraged for both scanning and exercise tracking
- **Chrome Storage API** - Extended to store scan results and exercise progress
- **Existing UI Framework** - Navigation integration with current sidepanel

### New Architecture Components

#### 1. Dedicated Page System
- **ScanPageController** - Manages the dedicated full body scan page
- **ExercisePageController** - Manages the dedicated exercise page
- **NavigationManager** - Handles transitions between pages and main extension

#### 2. AI-Powered Scan System
- **EnhancedPostureAnalyzer** - Calculates comprehensive posture metrics
- **AIReportGenerator** - Integrates with Chrome's AI Summarizer API
- **PostureDataProcessor** - Processes raw pose data into structured metrics

#### 3. Exercise Framework
- **ExerciseOrchestrator** - Manages exercise flow and state transitions
- **AudioSequenceManager** - Handles audio playback timing and sequencing
- **PoseValidationEngine** - Real-time pose detection and validation
- **CalibrationManager** - Manages baseline pose capture and calibration

#### 4. Exercise-Specific Controllers
- **SitTallExerciseController** - Manages meditation-style posture exercise
- **NeckRotationController** - Handles left-right neck rotation exercise
- **NeckTiltController** - Manages up-down neck tilt exercise

#### 5. Cross-Platform Compatibility
- **DeviceOrientationHandler** - Manages iOS/Android camera orientation differences
- **PoseDetectionNormalizer** - Ensures consistent pose detection across devices

## Components and Interfaces

### 1. Scan Page System

#### ScanPageController
```javascript
class ScanPageController {
  constructor() {
    this.postureAnalyzer = new EnhancedPostureAnalyzer();
    this.aiReportGenerator = new AIReportGenerator();
    this.navigationManager = new NavigationManager();
  }
  
  // Initialize scan page
  initializeScanPage()
  
  // Setup camera and MediaPipe
  setupCameraFeed()
  
  // Perform full body scan
  performFullBodyScan()
  
  // Generate AI report
  generateScanReport(postureData)
  
  // Navigate to exercises
  navigateToExercises()
}
```

#### EnhancedPostureAnalyzer
```javascript
class EnhancedPostureAnalyzer {
  // Calculate neck tilt angle
  calculateNeckTilt(landmarks)
  
  // Calculate shoulder tilt (left-right imbalance)
  calculateShoulderTilt(landmarks)
  
  // Calculate spine curvature angle
  calculateSpineCurvature(landmarks)
  
  // Calculate slouch count based on forward deviation
  calculateSlouchCount(landmarks)
  
  // Generate overall posture score
  calculatePostureScore(metrics)
  
  // Create structured posture data
  createPostureMetrics(landmarks) {
    return {
      timestamp: Date.now(),
      neckTilt: this.calculateNeckTilt(landmarks),
      shoulderTilt: this.calculateShoulderTilt(landmarks),
      spineAngle: this.calculateSpineCurvature(landmarks),
      slouchCount: this.calculateSlouchCount(landmarks),
      postureScore: this.calculatePostureScore(landmarks)
    };
  }
}
```

#### AIReportGenerator
```javascript
class AIReportGenerator {
  // Initialize Chrome AI Summarizer
  async initializeAISummarizer() {
    this.summarizer = await window.ai.summarizer.create({
      expectedInputs: [{ type: "text", languages: ["en"] }],
      expectedOutputs: [{ type: "text", languages: ["en"] }]
    });
  }
  
  // Generate friendly posture report
  async generatePostureReport(postureMetrics) {
    const prompt = this.createReportPrompt(postureMetrics);
    return await this.summarizer.summarize({
      text: JSON.stringify(postureMetrics),
      context: prompt
    });
  }
  
  // Create AI prompt for report generation
  createReportPrompt(metrics) {
    return "Summarize this posture scan into a two-section daily report with headings 'Summary' and 'Motivation'. Use simple, friendly language. Include specific feedback about neck tilt, shoulder alignment, and spine posture. Provide encouraging motivation for improvement.";
  }
}
```

### 2. Exercise Page System

#### ExercisePageController
```javascript
class ExercisePageController {
  constructor() {
    this.exerciseOrchestrator = new ExerciseOrchestrator();
    this.navigationManager = new NavigationManager();
  }
  
  // Initialize exercise page
  initializeExercisePage()
  
  // Display available exercises
  displayExerciseOptions()
  
  // Start selected exercise
  startExercise(exerciseType)
  
  // Handle exercise completion
  handleExerciseCompletion(results)
}
```

#### ExerciseOrchestrator
```javascript
class ExerciseOrchestrator {
  constructor() {
    this.audioManager = new AudioSequenceManager();
    this.poseValidator = new PoseValidationEngine();
    this.calibrationManager = new CalibrationManager();
  }
  
  // Initialize exercise session
  initializeExercise(exerciseType)
  
  // Create exercise-specific controller
  createExerciseController(exerciseType) {
    switch(exerciseType) {
      case 'sit-tall':
        return new SitTallExerciseController(this.audioManager, this.poseValidator);
      case 'neck-rotation':
        return new NeckRotationController(this.audioManager, this.poseValidator);
      case 'neck-tilt':
        return new NeckTiltController(this.audioManager, this.poseValidator);
    }
  }
  
  // Manage exercise state transitions
  handleStateTransition(fromState, toState)
  
  // Clean up exercise resources
  cleanupExercise()
}
```

### 3. Audio Management System

#### AudioSequenceManager
```javascript
class AudioSequenceManager {
  constructor() {
    this.audioContext = new AudioContext();
    this.audioBuffers = new Map();
    this.currentAudio = null;
  }
  
  // Load audio files from sounds folder
  async loadAudioFiles() {
    const audioFiles = [
      'sittall.mp3', 'countdown.mp3', 'meditationstarted.mp3',
      'correctposture.mp3', 'welldone.mp3', 'neckrotationstarted.mp3',
      'turnlefttillbeep.mp3', 'nowturnright.mp3', 'faceforward.mp3',
      'neckrepeat.mp3', 'tiltupwardnew.mp3', 'tiltdown.mp3', 'tiltrepeat.mp3'
    ];
    
    for (const file of audioFiles) {
      await this.loadAudioFile(file);
    }
  }
  
  // Play specific audio file
  async playAudio(filename, loop = false)
  
  // Stop current audio
  stopCurrentAudio()
  
  // Play audio sequence with timing
  async playSequence(audioSequence)
  
  // Handle nature sounds looping for meditation
  startNatureSoundsLoop()
}
```

### 4. Exercise-Specific Controllers

#### SitTallExerciseController
```javascript
class SitTallExerciseController {
  constructor(audioManager, poseValidator) {
    this.audioManager = audioManager;
    this.poseValidator = poseValidator;
    this.state = 'initialization';
    this.baseline = null;
    this.meditationTimer = null;
  }
  
  // Start exercise with audio sequence
  async startExercise() {
    this.state = 'initialization';
    await this.audioManager.playAudio('sittall.mp3');
    await this.audioManager.playAudio('countdown.mp3');
    await this.calibrationPhase();
  }
  
  // Calibration phase - capture baseline
  async calibrationPhase() {
    this.state = 'calibration';
    // Start pose tracking during audio
    this.poseValidator.startCalibration();
    
    // Wait 2 seconds after countdown, then capture baseline
    setTimeout(() => {
      this.baseline = this.poseValidator.captureBaseline();
      this.startMeditationPhase();
    }, 2000);
  }
  
  // Meditation phase with posture monitoring
  async startMeditationPhase() {
    this.state = 'meditation';
    await this.audioManager.playAudio('meditationstarted.mp3');
    
    // Start 3-minute timer with nature sounds
    this.audioManager.startNatureSoundsLoop();
    this.startMeditationTimer();
    this.startPostureMonitoring();
  }
  
  // Monitor posture during meditation
  startPostureMonitoring() {
    this.postureCheckInterval = setInterval(() => {
      const currentPose = this.poseValidator.getCurrentPose();
      const deviation = this.calculateDeviation(currentPose, this.baseline);
      
      if (deviation > 0.05) {
        this.handlePostureDeviation();
      } else {
        this.handleCorrectPosture();
      }
    }, 200);
  }
  
  // Handle posture correction
  handlePostureDeviation() {
    if (!this.correctionActive) {
      this.correctionStartTime = Date.now();
      this.correctionActive = true;
      
      setTimeout(() => {
        if (this.correctionActive) {
          this.pauseTimer();
          this.audioManager.playAudio('correctposture.mp3', true);
        }
      }, 2000);
    }
  }
  
  // Handle return to correct posture
  handleCorrectPosture() {
    if (this.correctionActive) {
      this.correctionActive = false;
      this.audioManager.stopCurrentAudio();
      this.resumeTimer();
    }
  }
}
```

#### NeckRotationController
```javascript
class NeckRotationController {
  constructor(audioManager, poseValidator) {
    this.audioManager = audioManager;
    this.poseValidator = poseValidator;
    this.state = 'initialization';
    this.currentRep = 1;
    this.maxReps = 7;
    this.baseline = null;
    this.holdTimer = null;
    this.deviceHandler = new DeviceOrientationHandler();
  }
  
  // Start exercise with initialization
  async startExercise() {
    this.state = 'initialization';
    await this.audioManager.playAudio('neckrotationstarted.mp3');
    await this.audioManager.playAudio('countdown.mp3');
    
    // Capture baseline distances to both shoulders
    this.baseline = this.poseValidator.captureShoulderBaseline();
    this.startLeftTurnPhase();
  }
  
  // Left turn phase
  async startLeftTurnPhase() {
    this.state = 'left_turn';
    await this.audioManager.playAudio('turnlefttillbeep.mp3');
    this.enterDetectionMode('left');
  }
  
  // Right turn phase
  async startRightTurnPhase() {
    this.state = 'right_turn';
    await this.audioManager.playAudio('nowturnright.mp3');
    this.enterDetectionMode('right');
  }
  
  // Detection mode for pose validation
  enterDetectionMode(direction) {
    this.detectionInterval = setInterval(() => {
      const currentPose = this.poseValidator.getCurrentPose();
      const isCorrectPose = this.validateTurnDirection(currentPose, direction);
      
      if (isCorrectPose) {
        this.startHoldTimer(direction);
      } else {
        this.resetHoldTimer();
      }
    }, 100);
  }
  
  // Validate turn direction based on device type
  validateTurnDirection(currentPose, direction) {
    const distances = this.poseValidator.getShoulderDistances(currentPose);
    const threshold = 0.1; // 10% change from baseline
    
    if (this.deviceHandler.isIOS()) {
      // iOS: standard orientation
      if (direction === 'left') {
        return distances.left > this.baseline.left * (1 + threshold) &&
               distances.right < this.baseline.right * (1 - threshold);
      } else {
        return distances.right > this.baseline.right * (1 + threshold) &&
               distances.left < this.baseline.left * (1 - threshold);
      }
    } else {
      // Android: mirrored preview
      if (direction === 'left') {
        return distances.right > this.baseline.right * (1 + threshold) &&
               distances.left < this.baseline.left * (1 - threshold);
      } else {
        return distances.left > this.baseline.left * (1 + threshold) &&
               distances.right < this.baseline.right * (1 - threshold);
      }
    }
  }
  
  // Hold timer management
  startHoldTimer(direction) {
    if (!this.holdTimer) {
      this.holdTimer = setTimeout(() => {
        this.handleSuccessfulHold(direction);
      }, 3000);
    }
  }
  
  // Handle successful 3-second hold
  async handleSuccessfulHold(direction) {
    clearInterval(this.detectionInterval);
    this.audioManager.playAudio('beep.mp3');
    
    if (direction === 'left') {
      // Play first-cycle audio if needed
      if (this.currentRep === 1) {
        await this.audioManager.playAudio('faceforward.mp3');
      }
      this.startRightTurnPhase();
    } else {
      // Play first-cycle audio if needed
      if (this.currentRep === 1) {
        await this.audioManager.playAudio('neckrepeat.mp3');
      }
      
      this.currentRep++;
      if (this.currentRep <= this.maxReps) {
        this.startLeftTurnPhase();
      } else {
        this.completeExercise();
      }
    }
    
    this.resetHoldTimer();
  }
}
```

#### NeckTiltController
```javascript
class NeckTiltController {
  constructor(audioManager, poseValidator) {
    this.audioManager = audioManager;
    this.poseValidator = poseValidator;
    this.state = 'initialization';
    this.currentRep = 1;
    this.maxReps = 7;
    this.baseline = null;
  }
  
  // Start exercise (similar structure to NeckRotationController)
  async startExercise() {
    this.state = 'initialization';
    await this.audioManager.playAudio('neckrotationstarted.mp3');
    await this.audioManager.playAudio('countdown.mp3');
    
    // Use same baseline as Sit Tall exercise
    this.baseline = this.poseValidator.captureNoseToShoulderBaseline();
    this.startUpTiltPhase();
  }
  
  // Up tilt detection
  validateUpTilt(currentPose) {
    const currentDistance = this.poseValidator.getNoseToShoulderDistance(currentPose);
    return currentDistance > this.baseline * 1.1; // 10% increase
  }
  
  // Down tilt detection
  validateDownTilt(currentPose) {
    const currentDistance = this.poseValidator.getNoseToShoulderDistance(currentPose);
    return currentDistance < this.baseline * 0.9; // 10% decrease
  }
  
  // Similar phase management as NeckRotationController
  // but with up/down detection instead of left/right
}
```

### 5. Pose Validation Engine

#### PoseValidationEngine
```javascript
class PoseValidationEngine {
  constructor() {
    this.mediaPipe = null; // MediaPipe pose detection instance
    this.currentPose = null;
    this.calibrationData = [];
  }
  
  // Initialize MediaPipe pose detection
  initializePoseDetection()
  
  // Start calibration data collection
  startCalibration() {
    this.calibrationData = [];
    this.calibrationInterval = setInterval(() => {
      if (this.currentPose) {
        this.calibrationData.push(this.currentPose);
      }
    }, 50); // Collect every 50ms
  }
  
  // Capture baseline measurements
  captureBaseline() {
    clearInterval(this.calibrationInterval);
    return this.calculateAverageBaseline(this.calibrationData);
  }
  
  // Calculate nose-to-shoulder-center distance
  getNoseToShoulderDistance(pose) {
    const nose = pose.landmarks[0]; // MediaPipe nose landmark
    const leftShoulder = pose.landmarks[11];
    const rightShoulder = pose.landmarks[12];
    
    const shoulderCenter = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };
    
    return Math.sqrt(
      Math.pow(nose.x - shoulderCenter.x, 2) + 
      Math.pow(nose.y - shoulderCenter.y, 2)
    );
  }
  
  // Get distances to individual shoulders
  getShoulderDistances(pose) {
    const nose = pose.landmarks[0];
    const leftShoulder = pose.landmarks[11];
    const rightShoulder = pose.landmarks[12];
    
    return {
      left: Math.sqrt(Math.pow(nose.x - leftShoulder.x, 2) + Math.pow(nose.y - leftShoulder.y, 2)),
      right: Math.sqrt(Math.pow(nose.x - rightShoulder.x, 2) + Math.pow(nose.y - rightShoulder.y, 2))
    };
  }
  
  // Update current pose from MediaPipe
  updateCurrentPose(poseResults) {
    this.currentPose = poseResults;
  }
  
  // Get current pose data
  getCurrentPose() {
    return this.currentPose;
  }
}
```

### 6. Device Compatibility

#### DeviceOrientationHandler
```javascript
class DeviceOrientationHandler {
  // Detect device type
  isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }
  
  isAndroid() {
    return /Android/.test(navigator.userAgent);
  }
  
  // Get camera orientation adjustments
  getCameraOrientation() {
    if (this.isIOS()) {
      return 'standard';
    } else if (this.isAndroid()) {
      return 'mirrored';
    }
    return 'standard';
  }
  
  // Adjust pose coordinates based on device
  adjustPoseCoordinates(pose) {
    if (this.isAndroid()) {
      // Mirror coordinates for Android
      return this.mirrorPoseCoordinates(pose);
    }
    return pose;
  }
}
```

## Data Models

### Posture Metrics Model
```javascript
{
  timestamp: number,
  neckTilt: number,      // degrees, negative = forward tilt
  shoulderTilt: number,  // degrees, positive = right shoulder higher
  spineAngle: number,    // degrees from vertical
  slouchCount: number,   // count of forward deviations
  postureScore: number   // 0-100 overall score
}
```

### Exercise Session Model
```javascript
{
  exerciseType: 'sit-tall' | 'neck-rotation' | 'neck-tilt',
  startTime: Date,
  endTime: Date,
  completedReps: number,
  targetReps: number,
  calibrationData: object,
  postureDeviations: number,
  correctionTime: number, // milliseconds spent in correction
  completed: boolean
}
```

### Audio Sequence Model
```javascript
{
  sequenceId: string,
  audioFiles: [
    {
      filename: string,
      duration: number,
      loop: boolean,
      delay: number // delay before playing
    }
  ],
  totalDuration: number
}
```

## Error Handling

### Camera and MediaPipe Failures
- Graceful camera permission handling
- MediaPipe initialization retry logic
- Fallback UI when pose detection fails
- User guidance for camera positioning

### Audio System Failures
- Audio context initialization handling
- File loading error recovery
- Browser audio policy compliance
- Silent mode fallback with visual cues

### AI Summarizer Failures
- Chrome AI API availability checking
- Fallback to template-based reports
- Network connectivity handling
- API quota management

### Exercise State Management
- Exercise interruption handling
- State recovery after page refresh
- Timer synchronization issues
- Pose detection accuracy validation

## Testing Strategy

### Unit Testing
- Individual exercise controller functionality
- Audio sequence timing validation
- Pose validation algorithm accuracy
- Device orientation handling

### Integration Testing
- End-to-end exercise flow testing
- Audio-pose synchronization validation
- Cross-device compatibility testing
- AI report generation testing

### User Experience Testing
- Exercise instruction clarity
- Pose detection responsiveness
- Audio timing and quality
- Navigation flow validation

### Performance Testing
- MediaPipe performance optimization
- Audio loading and playback efficiency
- Memory usage during long exercises
- Battery impact assessment

### Browser Compatibility Testing
- Chrome extension API compatibility
- MediaPipe performance across versions
- Audio API support validation
- AI Summarizer API availability