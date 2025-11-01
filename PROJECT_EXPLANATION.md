# Posturely Chrome Extension - Complete Project Explanation

## 🎯 Project Overview

**Posturely** is a Chrome Extension (Manifest V3) that provides real-time posture tracking and monitoring using computer vision. It uses MediaPipe Pose for body pose detection and offers AI-powered insights through Chrome's built-in AI APIs (when available).

## 📁 Project Structure

```
posturelychrome/
├── manifest.json              # Extension manifest (V3)
├── background.js              # Service worker for extension lifecycle
├── sidepanel.html/js          # Main UI panel
├── scan.html                  # Full body scan page
├── exercises.html             # Exercise routines page
├── analytics.html/js          # Analytics dashboard
├── achievements.html/js       # Achievement system
├── src/                       # Core source files (33 modules)
│   ├── AIServicesManager.js   # Chrome AI APIs coordinator
│   ├── LanguageModelManager.js # Translation API manager
│   ├── EnhancedPostureAnalyzer.js # Posture analysis engine
│   ├── DataPersistenceManager.js  # Data storage manager
│   ├── BreakReminderManager.js   # Smart break reminders
│   └── ... (28 more modules)
├── mediapipe/                 # MediaPipe pose detection library
├── sounds/                    # Audio feedback files
└── icons/                     # Extension icons
```

## 🔌 APIs and Technologies Used

### 1. **Chrome Extension APIs**

#### `chrome.storage` (Local Storage)
- **Usage**: Persistent data storage for:
  - Tracking statistics by date (`statsByDate`)
  - User preferences (language, reminders, settings)
  - Session data and posture metrics
  - Achievement progress
- **Files**: Used across all modules
- **Key Operations**:
  ```javascript
  chrome.storage.local.get(['statsByDate'], callback)
  chrome.storage.local.set({ statsByDate: data }, callback)
  chrome.storage.local.getBytesInUse() // Storage quota checking
  ```

#### `chrome.runtime`
- **Usage**: Extension communication and resource access
- **Key Methods**:
  - `chrome.runtime.getURL()` - Get extension resource URLs
  - `chrome.runtime.onMessage` - Inter-component messaging
  - `chrome.runtime.onInstalled` - Extension lifecycle
  - `chrome.runtime.sendMessage()` - Send messages between contexts

#### `chrome.action`
- **Usage**: Extension icon and badge management
- **Methods**:
  - `chrome.action.setTitle()` - Update icon tooltip
  - `chrome.action.onClicked` - Handle icon clicks

#### `chrome.sidePanel`
- **Usage**: Open and manage side panel UI
- **Methods**:
  - `chrome.sidePanel.open({ windowId })` - Open side panel

#### `chrome.tabs`
- **Usage**: Create new tabs for scan/exercises/analytics pages
- **Methods**:
  - `chrome.tabs.create({ url })` - Open extension pages

#### `chrome.notifications`
- **Usage**: Break reminder notifications
- **Permission**: `"notifications"` in manifest

### 2. **Chrome Built-in AI APIs** (Optional - Experimental)

These APIs require:
- Chrome Canary/Dev 127+
- Origin Trial tokens
- Chrome flags enabled
- Chrome AI Early Preview Program enrollment

#### `Summarizer` API
- **Purpose**: Generate intelligent posture session summaries
- **Usage** in `AIServicesManager.js`:
  ```javascript
  const session = await self.Summarizer.create({
    type: 'tldr',
    format: 'plain-text',
    length: 'medium'
  });
  const summary = await session.summarize(prompt);
  ```
- **Fallback**: Pre-written static summaries if API unavailable

#### `LanguageModel` API
- **Purpose**: Generate motivational messages and custom content
- **Usage**:
  ```javascript
  const session = await self.LanguageModel.create({
    temperature: 1.0,
    topK: 3
  });
  const message = await session.prompt(prompt);
  // Streaming support:
  const stream = session.promptStreaming(prompt);
  ```
- **Features**: 
  - Streaming responses (`promptStreaming`)
  - Token quota management (`inputQuota`, `inputUsage`)

#### `Translator` API
- **Purpose**: Multi-language support (12+ languages)
- **Usage** in `LanguageModelManager.js`:
  ```javascript
  const availability = await Translator.availability({
    sourceLanguage: 'en',
    targetLanguage: 'hi'
  });
  const translator = await Translator.create({
    sourceLanguage: 'en',
    targetLanguage: 'hi',
    monitor(monitor) {
      monitor.addEventListener('downloadprogress', (e) => {
        // Track model download progress
      });
    }
  });
  const translation = await translator.translate('Hello');
  ```
- **Supported Languages**: en, es, ja, fr, de, it, pt, ko, zh, hi, ar, ru
- **Features**: 
  - Model download tracking
  - Availability checking
  - Offline translation (after model download)

#### `Writer` API
- **Purpose**: Generate break reminders and custom content
- **Usage**:
  ```javascript
  const session = await self.Writer.create({
    tone: 'friendly',
    format: 'plain-text',
    length: 'short'
  });
  const content = await session.write(prompt);
  ```

#### `Rewriter` API
- **Purpose**: Rewrite/improve existing content
- **Usage**:
  ```javascript
  const session = await self.Rewriter.create({
    tone: 'as-is',
    format: 'as-is',
    length: 'as-is'
  });
  const rewritten = await session.rewrite(text);
  ```

**AI API Availability Checking**:
- `Summarizer.availability()` → Returns: 'readily', 'after-download', 'unavailable'
- `LanguageModel.availability()` → Similar status
- `Translator.availability({ sourceLanguage, targetLanguage })` → Language pair availability

### 3. **Web APIs**

#### `navigator.mediaDevices.getUserMedia()`
- **Purpose**: Camera access for pose detection
- **Usage**:
  ```javascript
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { 
      width: 1280, 
      height: 720,
      facingMode: 'user' 
    }
  });
  ```
- **Files**: `sidepanel.js`, `ScanPageController.js`, `ExercisePageController.js`
- **Permission**: Camera permissions requested via Chrome

#### `navigator.storage`
- **Purpose**: Check device storage for AI model downloads
- **Usage**:
  ```javascript
  const estimate = await navigator.storage.estimate();
  const availableGB = (estimate.quota - estimate.usage) / (1024 ** 3);
  ```
- **Requirements**: AI models need ~2-4 GB storage

#### `Canvas API` / `WebGL`
- **Purpose**: Render pose landmarks and skeleton overlay on camera feed
- **Usage**: Drawing pose keypoints on video frames
- **Files**: `ScanPageController.js`, `ExercisePageController.js`

#### `AudioContext` / `Web Audio API`
- **Purpose**: Play audio feedback for exercises and alerts
- **Usage**:
  ```javascript
  const audioContext = new AudioContext();
  const audio = new Audio(chrome.runtime.getURL('sounds/beep.mp3'));
  ```
- **Files**: `AudioSequenceManager.js`, `AudioAlertService.js`

#### `fetch()`
- **Purpose**: Load MediaPipe library files
- **Usage**: Loading WASM modules and models from extension resources

### 4. **MediaPipe Pose API**

- **Library**: MediaPipe Tasks Vision
- **Purpose**: Real-time pose detection using 33 body landmarks
- **Model**: `pose_landmarker_lite.task` (lite model for performance)
- **Usage**:
  ```javascript
  import { FilesetResolver, PoseLandmarker } from 'mediapipe/vision_bundle.mjs';
  
  const vision = await FilesetResolver.forVisionTasks(wasmRoot);
  const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: modelPath },
    runningMode: 'VIDEO',
    numPoses: 1
  });
  
  const result = poseLandmarker.detectForVideo(videoFrame, timestamp);
  const keypoints = result.landmarks[0];
  ```
- **Key Landmarks**: nose, shoulders, hips, elbows, wrists, knees, ankles
- **Files**: `ScanPageController.js`, `ExercisePageController.js`, `sidepanel.js`

### 5. **Browser Storage APIs**

#### `localStorage` / `sessionStorage`
- **Usage**: Minimal - primarily uses `chrome.storage.local` instead

#### `window.history`
- **Purpose**: Navigation between extension pages
- **Usage**: `window.history.pushState()`, `window.history.back()`

## 🏗️ Architecture

### Core Components

1. **Background Service Worker** (`background.js`)
   - Extension lifecycle management
   - Icon state updates
   - Message routing

2. **Side Panel** (`sidepanel.html/js`)
   - Main UI dashboard
   - Real-time posture tracking
   - Statistics display
   - Language selection
   - AI features toggle

3. **Scan Page** (`scan.html` + `ScanPageController.js`)
   - Full body posture scan
   - Multi-view capture
   - AI-generated posture reports

4. **Exercises Page** (`exercises.html` + `ExercisePageController.js`)
   - Guided posture exercises:
     - Sit Tall
     - Neck Tilt
     - Neck Rotation
   - Real-time pose validation

5. **Analytics Page** (`analytics.html/js`)
   - Historical posture data visualization
   - Calendar view
   - Trends and statistics

6. **Achievements Page** (`achievements.html/js`)
   - Gamification system
   - Achievement tracking
   - Milestone rewards

### Key Source Modules (33 files)

#### AI & Language
- `AIServicesManager.js` - Coordinates all Chrome AI APIs
- `LanguageModelManager.js` - Translation API management
- `HybridTranslator.js` - Translation wrapper with fallbacks
- `EnhancedLanguageManager.js` - Language selection UI
- `LocalizationService.js` - Interface translation service

#### Posture Analysis
- `EnhancedPostureAnalyzer.js` - Core posture calculation engine
  - Neck tilt detection
  - Shoulder alignment
  - Spine curvature
  - Slouch detection
  - Overall posture score (0-100)

#### Exercise Controllers
- `ExerciseOrchestrator.js` - Exercise flow coordination
- `NeckRotationController.js` - Neck rotation exercise
- `NeckTiltController.js` - Neck tilt exercise
- `SitTallExerciseController.js` - Sit tall exercise
- `PoseValidationEngine.js` - Real-time pose validation

#### Data Management
- `DataPersistenceManager.js` - Minute-by-minute tracking storage
- `DataIntegrityValidator.js` - Data validation
- `GoalTracker.js` - User goal tracking
- `ComprehensiveAchievementManager.js` - Achievement system

#### UI & UX
- `UIComponentManager.js` - UI state management
- `NavigationManager.js` - Page navigation
- `ThemeSynchronizationService.js` - Theme consistency
- `BadgeSystem.js` - Achievement badges

#### Audio & Alerts
- `AudioSequenceManager.js` - Exercise audio sequences
- `AudioAlertService.js` - Posture alerts
- `CountdownAudioService.js` - Exercise countdowns
- `PostureThresholdMonitor.js` - Threshold-based alerts

#### Scanning & Reporting
- `EnhancedScanManager.js` - Advanced scanning features
- `MultiViewCaptureEngine.js` - Multi-angle capture
- `AIReportGenerator.js` - AI-powered posture reports
- `PostureReportGenerator.js` - Standard reports

#### Reminders & Insights
- `BreakReminderManager.js` - Smart break reminders
  - Adaptive timing based on posture
  - Chrome notifications integration
  - Exercise suggestions
- `AIMotivationManager.js` - AI motivational messages
- `AIInsightsManager.js` - AI insights and tips

## 🔄 Data Flow

### Posture Tracking Flow

1. **User starts tracking** → `sidepanel.js`
2. **Camera accessed** → `navigator.mediaDevices.getUserMedia()`
3. **MediaPipe loads** → `FilesetResolver` + `PoseLandmarker`
4. **Continuous detection** → `poseLandmarker.detectForVideo()` every frame
5. **Analysis** → `EnhancedPostureAnalyzer.analyzePosture()`
6. **Metrics calculated**:
   - Neck tilt angle
   - Shoulder alignment
   - Spine curvature
   - Slouch score
   - Overall posture score (0-100)
7. **Storage** → `DataPersistenceManager.addMinutesToToday()`
8. **UI Update** → Real-time score display
9. **Alerts** → `PostureThresholdMonitor` checks thresholds
10. **Session end** → Data persisted, AI summary generated (if available)

### AI Features Flow (When Available)

1. **Check availability** → `AIServicesManager.checkAIAvailability()`
2. **Generate content**:
   - Summaries: `Summarizer.create()` → `session.summarize()`
   - Motivational: `LanguageModel.create()` → `session.prompt()`
   - Translation: `Translator.create()` → `translator.translate()`
3. **Fallback** → Pre-written content if APIs unavailable
4. **Display** → Translated/processed content in UI

### Translation Flow

1. **User selects language** → `EnhancedLanguageManager.setLanguage()`
2. **Check availability** → `Translator.availability({ sourceLanguage, targetLanguage })`
3. **Download model** (if needed) → `Translator.create()` with download monitor
4. **Translate interface** → `LocalizationService.translateCurrentInterface()`
5. **Cache translations** → Store in `chrome.storage.local`

## 📊 Data Structure

### Storage Schema (`chrome.storage.local`)

```javascript
{
  // Tracking data
  statsByDate: {
    "2024-01-15": {
      minutes: 120,           // Total minutes tracked
      scoreSum: 8500,         // Sum of all scores
      samples: 100,           // Number of posture samples
      notes: "",              // User notes
      sessions: [             // Individual sessions
        {
          id: "1705320000000",
          startTime: "2024-01-15T10:00:00Z",
          endTime: "2024-01-15T11:30:00Z",
          minutes: 90,
          avgScore: 85,
          mood: "good",
          moodTimestamp: "2024-01-15T10:05:00Z"
        }
      ]
    }
  },
  
  // Settings
  isTracking: false,
  isScanning: false,
  settings: {
    alertThreshold: 80,
    soundEnabled: true
  },
  
  // Language
  userLanguage: "en",
  downloadedModels: ["es", "ja"],  // Downloaded translation models
  
  // Break reminders
  breakReminders: {
    enabled: true,
    frequency: 30,            // minutes
    threshold: 80
  },
  
  // AI setup
  aiSetupDismissed: false
}
```

## 🎯 Key Features

### 1. **Real-time Posture Tracking**
- Continuous pose detection via MediaPipe
- Live score calculation (0-100)
- Visual feedback (color-coded)
- Auto-calibration

### 2. **Full Body Scan**
- Capture posture from multiple angles
- Skeletal overlay visualization
- AI-generated reports (when available)
- Download scan images

### 3. **Guided Exercises**
- Sit Tall exercise
- Neck Tilt exercises
- Neck Rotation exercises
- Real-time pose validation
- Audio-guided instructions

### 4. **Analytics Dashboard**
- Daily/weekly/monthly statistics
- Calendar visualization
- Trend analysis
- Score distribution charts

### 5. **Achievement System**
- Milestone tracking
- Badge rewards
- Progress visualization
- Gamification elements

### 6. **Smart Break Reminders**
- Adaptive timing based on posture quality
- Chrome notifications
- Exercise suggestions
- Respects user dismissals

### 7. **AI-Powered Insights** (Optional)
- Intelligent session summaries
- Personalized motivational messages
- Context-aware break suggestions
- Multi-language support (12+ languages)

## 🔐 Permissions & Security

### Manifest Permissions
```json
{
  "permissions": [
    "storage",           // Local data storage
    "sidePanel",        // Side panel UI
    "tabs",             // Open extension pages
    "notifications",    // Break reminders
    "aiLanguageModel"   // Chrome AI APIs (experimental)
  ]
}
```

### Privacy Features
- ✅ All processing happens locally (no server communication)
- ✅ Camera only accessed when actively tracking
- ✅ Images only saved when user explicitly captures
- ✅ AI models run on-device (Chrome AI APIs)
- ✅ Data stored locally in browser

## 🧪 Testing

### Test Files (50+ test files)
- `test-*.html` - Manual testing pages
- `tests/*.js` - Automated Vitest tests
- Test coverage for:
  - API availability
  - Translation functionality
  - Exercise controllers
  - Data persistence
  - Cross-browser compatibility

### Test Framework
- **Vitest** for unit tests
- **jsdom** for DOM simulation
- Manual test pages for integration testing

## 🚀 Setup Requirements

### Basic Setup (Core Features)
1. Chrome 88+ (or Chromium-based browser)
2. Load extension in developer mode
3. Grant camera permissions

### AI Features Setup (Optional)
1. Chrome Canary/Dev 127+
2. Join Chrome AI Early Preview Program
3. Enable Chrome flags:
   - `#optimization-guide-on-device-model`
   - `#prompt-api-for-gemini-nano`
   - `#summarization-api-for-gemini-nano`
   - `#translation-api`
4. Register for Origin Trial tokens
5. Add tokens to `manifest.json`
6. 2-4 GB free storage for AI models

## 📝 API Usage Summary

| API | Purpose | Required Setup | Fallback |
|-----|---------|----------------|----------|
| `chrome.storage` | Data persistence | Built-in | N/A |
| `navigator.mediaDevices` | Camera access | User permission | None |
| MediaPipe Pose | Pose detection | Library included | None |
| `Summarizer` API | AI summaries | Origin Trial | Static text |
| `LanguageModel` API | AI messages | Origin Trial | Static text |
| `Translator` API | Multi-language | Origin Trial | English only |
| `Writer` API | Content generation | Origin Trial | Static text |
| `Rewriter` API | Content rewriting | Origin Trial | Original text |
| `chrome.notifications` | Break reminders | Permission | In-app alerts |

## 🔄 Extension Lifecycle

1. **Install** → `background.js` sets defaults
2. **Startup** → Icon state restored from storage
3. **Icon Click** → Opens side panel
4. **User Interaction** → Tracking/exercises/analytics
5. **Data Persistence** → Continuous saving to `chrome.storage`
6. **Updates** → Handled via `chrome.runtime.onInstalled`

## 📦 Dependencies

### External Libraries
- **MediaPipe Tasks Vision** - Pose detection (bundled)
- **TensorFlow.js** (vendor) - Legacy support
- **PoseNet** (vendor) - Alternative pose detection

### No npm Dependencies (Vanilla JS)
- All code is ES6 modules
- No build step required
- Direct browser execution

## 🎨 UI/UX Features

- Modern, clean design
- Color-coded posture scores:
  - 🟢 Green: 80-100 (Good)
  - 🟠 Orange: 60-79 (Fair)
  - 🔴 Red: 0-59 (Poor)
- Responsive layout
- Accessibility considerations
- Dark/light theme support (via `ThemeSynchronizationService`)

## 🔧 Development Notes

- **Manifest V3** compliant
- **ES6 Modules** throughout
- **Service Worker** for background tasks
- **Local-first** architecture (no server)
- **Progressive enhancement** (works without AI features)
- **Error handling** with fallbacks for all AI features
- **Comprehensive logging** for debugging

---

This extension demonstrates advanced Chrome Extension development with:
- Real-time computer vision
- Chrome's experimental AI APIs
- Complex data persistence
- Multi-page navigation
- Audio/visual feedback systems
- Achievement/gamification systems

All core features work without AI, making it accessible to all Chrome users while providing enhanced experiences for those with Chrome AI capabilities enabled.
