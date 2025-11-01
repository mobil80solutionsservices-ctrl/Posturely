# Design Document

## Overview

This design document outlines the architecture and implementation approach for completing the Posturely Chrome extension with AI-powered features and critical bug fixes. The design prioritizes fixing existing broken functionality (minute tracking, calendar analytics) before implementing new AI features using Chrome's built-in APIs (Summarizer, Writer, Translator).

The system maintains privacy-first principles by using local Chrome AI models and chrome.storage.local for all data persistence. The design ensures seamless integration with the existing MediaPipe-based posture tracking system.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Chrome Extension                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Side Panel    │  │  Analytics Page │  │ Background   │ │
│  │   (Main UI)     │  │  (Dedicated)    │  │   Service    │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Data Persistence│  │   AI Services   │  │ Notification │ │
│  │    Manager      │  │    Manager      │  │   Manager    │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Chrome Storage  │  │  Chrome AI APIs │  │ MediaPipe    │ │
│  │     Local       │  │ (Built-in APIs) │  │   Vision     │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

1. **Data Persistence Manager**: Handles minute-by-minute tracking data storage
2. **AI Services Manager**: Coordinates Chrome's built-in AI APIs
3. **Analytics Page**: Dedicated page for comprehensive data visualization
4. **Notification Manager**: Handles break reminders and badge notifications
5. **Language Model Manager**: Manages translation model downloads

## Components and Interfaces

### 1. Data Persistence Manager

**Purpose**: Fix and enhance the current data storage system to properly track minutes and persist data.

**Key Methods**:
```javascript
class DataPersistenceManager {
  // Fix minute tracking
  incrementMinuteCounter(date)
  saveTrackingData(sessionData)
  
  // Enhanced storage
  getTrackingHistory(dateRange)
  compressOldData(cutoffDate)
  
  // Data integrity
  validateStorageData()
  migrateDataFormat()
}
```

**Storage Schema**:
```javascript
{
  "statsByDate": {
    "2024-10-31": {
      "minutes": 45,           // Total minutes tracked (fixed)
      "sessions": [            // Individual sessions
        {
          "startTime": "14:30",
          "endTime": "15:15", 
          "avgScore": 82,
          "mood": "focused"
        }
      ],
      "notes": "Feeling productive today"
    }
  },
  "userPreferences": {
    "language": "en",
    "breakReminders": true,
    "goalMinutesPerDay": 60
  },
  "badges": ["first_session", "week_streak"],
  "goals": {
    "dailyMinutes": 60,
    "currentStreak": 5
  }
}
```

### 2. AI Services Manager

**Purpose**: Coordinate Chrome's built-in AI APIs for summaries, motivation, and translation.

**Key Methods**:
```javascript
class AIServicesManager {
  // Summarizer API
  async generatePostureSummary(sessionData, moodData)
  
  // Writer API  
  async generateMotivationalMessage(performance, mood)
  
  // Translator API
  async translateContent(text, targetLanguage)
  async downloadLanguageModel(language, progressCallback)
  
  // Fallback handling
  getFallbackContent(contentType)
}
```

**API Integration Pattern**:
```javascript
// Chrome AI API usage pattern
async function useAIService(apiName, prompt, fallback) {
  try {
    const apiMap = {
      'summarizer': chrome.ai.summarizer,
      'writer': chrome.ai.languageModel,
      'translator': chrome.ai.translator
    };
    
    const api = apiMap[apiName];
    if (api && await api.capabilities()) {
      const session = await api.create();
      const result = apiName === 'summarizer' 
        ? await session.summarize(prompt)
        : await session.prompt(prompt);
      session.destroy();
      return result;
    }
  } catch (error) {
    console.warn(`${apiName} unavailable, using fallback`);
    return fallback;
  }
}
```

### 3. Analytics Page Component

**Purpose**: Replace the current inline analytics with a dedicated page for better data visualization.

**Navigation Flow**:
```
Main Panel → "View all data" → Analytics Page
                                    ↓
                              [Back to Main]
```

**Key Features**:
- Full-screen calendar view
- Enhanced data visualization
- Export functionality
- Detailed session breakdowns

**HTML Structure**:
```html
<!-- analytics.html -->
<div class="analytics-container">
  <header class="analytics-header">
    <button id="backToMain">← Back</button>
    <h1>Posture Analytics</h1>
  </header>
  
  <div class="analytics-content">
    <div class="calendar-section">
      <!-- Enhanced calendar -->
    </div>
    
    <div class="insights-section">
      <!-- AI-generated insights -->
    </div>
    
    <div class="goals-section">
      <!-- Goal tracking -->
    </div>
  </div>
</div>
```

### 4. Language Model Manager

**Purpose**: Handle Chrome Translator API model downloads with progress tracking.

**Key Methods**:
```javascript
class LanguageModelManager {
  async checkModelAvailability(language)
  async downloadModel(language, progressCallback)
  async getAvailableLanguages()
  
  // Progress tracking
  showDownloadProgress(language, progress)
  hideDownloadProgress()
}
```

**Download Flow**:
```javascript
// Language selection flow
async function selectLanguage(newLanguage) {
  const available = await languageManager.checkModelAvailability(newLanguage);
  
  if (!available) {
    // Show progress bar
    await languageManager.downloadModel(newLanguage, (progress) => {
      updateProgressBar(progress);
    });
  }
  
  // Save preference and apply
  await saveLanguagePreference(newLanguage);
  await translateCurrentContent(newLanguage);
}
```

## Data Models

### Enhanced Session Data Model

```javascript
{
  sessionId: "uuid",
  date: "2024-10-31",
  startTime: "14:30:00",
  endTime: "15:15:00",
  totalMinutes: 45,
  postureScores: [85, 82, 78, 80], // Sample scores during session
  averageScore: 81,
  mood: "focused",
  notes: "Working on important project",
  breaks: [
    { time: "14:45", type: "stretch", duration: 2 }
  ],
  aiInsights: "Your posture improved during focused work periods.",
  motivationalMessage: "Great job maintaining good posture while focused!"
}
```

### Badge System Data Model

```javascript
{
  badges: [
    {
      id: "first_session",
      name: "Getting Started",
      description: "Complete your first tracking session",
      earnedDate: "2024-10-31",
      icon: "🎯"
    },
    {
      id: "week_streak", 
      name: "Week Warrior",
      description: "Track posture for 7 consecutive days",
      earnedDate: "2024-11-07",
      icon: "🔥"
    }
  ]
}
```

## Error Handling

### AI API Fallback Strategy

```javascript
const FALLBACK_CONTENT = {
  summaries: [
    "Your posture tracking session is complete. Keep up the good work!",
    "Remember to take breaks and maintain good posture throughout the day."
  ],
  motivational: [
    "Great job on your posture tracking session!",
    "Every minute of good posture counts towards better health.",
    "You're building healthy habits one session at a time."
  ]
};

async function getAIContent(type, data) {
  try {
    return await aiServicesManager.generate(type, data);
  } catch (error) {
    console.warn(`AI ${type} failed, using fallback`);
    return getRandomFallback(type);
  }
}
```

### Data Persistence Error Handling

```javascript
async function safeStorageOperation(operation) {
  try {
    return await operation();
  } catch (error) {
    if (error.message.includes('QUOTA_EXCEEDED')) {
      await dataPersistenceManager.compressOldData();
      return await operation(); // Retry once
    }
    throw error;
  }
}
```

## Testing Strategy

### Unit Testing Focus Areas

1. **Data Persistence Manager**
   - Minute increment accuracy
   - Storage quota handling
   - Data migration logic

2. **AI Services Manager**
   - API availability detection
   - Fallback content selection
   - Error handling paths

3. **Language Model Manager**
   - Download progress tracking
   - Model availability checks
   - Translation accuracy

### Integration Testing

1. **End-to-End Tracking Flow**
   - Start tracking → minute increments → data persistence → analytics display

2. **AI Content Generation Flow**
   - Session completion → AI summary → translation → display

3. **Analytics Navigation Flow**
   - Main panel → analytics page → data visualization → back navigation

### Performance Testing

1. **Storage Performance**
   - Large dataset handling
   - Query performance for analytics
   - Memory usage optimization

2. **AI API Performance**
   - Response time measurement
   - Fallback activation timing
   - Model download progress

## Implementation Phases

### Phase 1: Fix Core Functionality (Priority 1)
- Fix minute-by-minute tracking
- Repair calendar analytics
- Implement dedicated analytics page

### Phase 2: AI Integration (Priority 2)  
- Implement Chrome AI API integration
- Add mood logging
- Create language model download system

### Phase 3: Enhanced Features (Priority 3)
- Break reminder system
- Badge/gamification system
- Goal tracking
- Toolbar indicator

### Phase 4: Polish & Optimization (Priority 4)
- Data compression/cleanup
- Performance optimization
- Enhanced error handling