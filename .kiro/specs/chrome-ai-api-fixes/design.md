# Chrome AI API Implementation Fixes - Design Document

## Overview

This design addresses critical issues in the posturelychrome extension's Chrome AI API implementation. The current implementation incorrectly uses `chrome.ai.*` patterns instead of the proper global API access patterns demonstrated in Google's official web-ai-demos. This design will fix these issues to ensure compatibility with Chrome's actual AI API implementation.

## Architecture

### Current Architecture Issues
- **Incorrect API Access**: Using `chrome.ai.summarizer`, `chrome.ai.languageModel`, `chrome.ai.translator` instead of global objects
- **Wrong Availability Checks**: Using `capabilities()` methods instead of `availability()` methods
- **Improper Session Management**: Not following the correct session creation and cleanup patterns
- **Missing Error Handling**: Not properly handling API unavailability scenarios

### Target Architecture
```
AIServicesManager
├── Global API Detection (self.LanguageModel, self.Summarizer, etc.)
├── Availability Checking (*.availability() methods)
├── Session Management (proper create/destroy lifecycle)
├── Streaming Response Handling
└── Fallback Content System

LanguageModelManager
├── Translation API Detection (self.Translator)
├── Model Availability Checking (Translator.availability())
├── Session-based Model Testing
└── Proper Error Messaging
```

## Components and Interfaces

### 1. AIServicesManager Refactor

#### API Detection Interface
```javascript
// Current (INCORRECT)
if (chrome.ai && chrome.ai.summarizer) { ... }

// Target (CORRECT)
if ('Summarizer' in self) { ... }
```

#### Availability Checking Interface
```javascript
// Current (INCORRECT)
const caps = await chrome.ai.summarizer.capabilities();
availability.summarizer = caps && caps.available === 'readily';

// Target (CORRECT)
const availability = await Summarizer.availability();
const isAvailable = availability === 'readily' || availability === 'after-download';
```

#### Session Creation Interface
```javascript
// Current (INCORRECT)
const session = await chrome.ai.summarizer.create();

// Target (CORRECT)
const session = await Summarizer.create({
  type: 'tldr',
  format: 'plain-text',
  length: 'medium'
});
```

### 2. LanguageModelManager Refactor

#### Translation API Detection
```javascript
// Current (INCORRECT)
this.apiAvailable = typeof chrome !== 'undefined' && 
                   chrome.ai && 
                   chrome.ai.translator;

// Target (CORRECT)
this.apiAvailable = 'Translator' in self;
```

#### Model Availability Checking
```javascript
// Current (INCORRECT)
const capabilities = await chrome.ai.translator.capabilities();
if (capabilities && capabilities.available === 'readily') { ... }

// Target (CORRECT)
const availability = await Translator.availability({
  sourceLanguage: 'en',
  targetLanguage: language
});
const isAvailable = availability !== 'unavailable';
```

### 3. Session Management Patterns

#### LanguageModel Sessions
```javascript
// Proper session creation with error handling
async createLanguageModelSession(options = {}) {
  if (!('LanguageModel' in self)) {
    throw new Error('LanguageModel API not available');
  }
  
  const availability = await LanguageModel.availability();
  if (availability === 'unavailable') {
    throw new Error('LanguageModel not available on this device');
  }
  
  return await LanguageModel.create({
    temperature: options.temperature || 1.0,
    topK: options.topK || 3,
    initialPrompts: options.initialPrompts || []
  });
}
```

#### Summarizer Sessions
```javascript
// Proper summarizer session creation
async createSummarizerSession(type = 'tldr', format = 'plain-text', length = 'medium') {
  if (!('Summarizer' in self)) {
    throw new Error('Summarizer API not available');
  }
  
  const availability = await Summarizer.availability();
  if (availability === 'unavailable') {
    throw new Error('Summarizer not available on this device');
  }
  
  return await Summarizer.create({ type, format, length });
}
```

#### Translator Sessions
```javascript
// Proper translator session creation
async createTranslatorSession(sourceLanguage, targetLanguage) {
  if (!('Translator' in self)) {
    throw new Error('Translator API not available');
  }
  
  const availability = await Translator.availability({
    sourceLanguage,
    targetLanguage
  });
  
  if (availability === 'unavailable') {
    throw new Error(`Translation from ${sourceLanguage} to ${targetLanguage} not supported`);
  }
  
  return await Translator.create({ sourceLanguage, targetLanguage });
}
```

## Data Models

### API Availability Status
```javascript
interface APIAvailability {
  languageModel: 'readily' | 'after-download' | 'unavailable';
  summarizer: 'readily' | 'after-download' | 'unavailable';
  translator: 'readily' | 'after-download' | 'unavailable';
  writer: 'readily' | 'after-download' | 'unavailable';
  rewriter: 'readily' | 'after-download' | 'unavailable';
}
```

### Session Configuration
```javascript
interface LanguageModelConfig {
  temperature?: number;
  topK?: number;
  initialPrompts?: Array<{role: string, content: string}>;
}

interface SummarizerConfig {
  type?: 'tldr' | 'key-points' | 'teaser' | 'headline';
  format?: 'plain-text' | 'markdown';
  length?: 'short' | 'medium' | 'long';
}

interface TranslatorConfig {
  sourceLanguage: string;
  targetLanguage: string;
}
```

### Usage Tracking
```javascript
interface UsageStats {
  // Handle both old and new API shapes
  inputUsage?: number;      // New API
  tokensSoFar?: number;     // Old API
  inputQuota?: number;      // New API
  maxTokens?: number;       // Old API
  tokensLeft: number;       // Calculated field
}
```

## Error Handling

### API Unavailability Scenarios
1. **Browser doesn't support API**: Show Origin Trial enrollment message
2. **Device doesn't support API**: Show device compatibility message
3. **Model needs download**: Handle download progress or show download required message
4. **Language pair unsupported**: Show specific language limitation message
5. **Session creation fails**: Provide fallback content and retry mechanism

### Error Message Templates
```javascript
const ERROR_MESSAGES = {
  API_NOT_SUPPORTED: 'Chrome AI features require joining the Early Preview Program',
  DEVICE_NOT_SUPPORTED: 'Your device does not support this AI feature',
  MODEL_DOWNLOAD_REQUIRED: 'Model download required for this feature',
  LANGUAGE_NOT_SUPPORTED: 'Translation not available for this language pair',
  SESSION_CREATION_FAILED: 'Unable to create AI session, using fallback content'
};
```

## Testing Strategy

### Unit Tests
1. **API Detection Tests**: Verify correct global object detection
2. **Availability Checking Tests**: Test all availability scenarios
3. **Session Creation Tests**: Verify proper session creation with various configurations
4. **Error Handling Tests**: Test all error scenarios and fallback behavior
5. **Usage Tracking Tests**: Verify both old and new API property handling

### Integration Tests
1. **End-to-End AI Workflows**: Test complete summary/motivation generation flows
2. **Translation Workflows**: Test language switching and model downloading
3. **Session Lifecycle Tests**: Test proper session creation, usage, and cleanup
4. **Fallback Content Tests**: Verify fallback behavior when APIs unavailable

### Browser Compatibility Tests
1. **Chrome Stable vs Canary**: Test both API shapes
2. **Origin Trial Scenarios**: Test with and without valid trial tokens
3. **Progressive Enhancement**: Verify graceful degradation when APIs unavailable

## Implementation Phases

### Phase 1: Core API Access Fixes
- Replace all `chrome.ai.*` references with global object access
- Update availability checking methods
- Fix session creation patterns

### Phase 2: Enhanced Error Handling
- Implement comprehensive error handling for all API scenarios
- Add proper user messaging for different unavailability cases
- Implement fallback content system improvements

### Phase 3: Session Management Improvements
- Implement proper session lifecycle management
- Add usage tracking for both API versions
- Optimize session reuse and cleanup

### Phase 4: Translation System Overhaul
- Refactor LanguageModelManager to use correct Translator API patterns
- Implement proper model availability testing
- Add better progress tracking for model downloads

## Migration Strategy

### Backward Compatibility
- Maintain fallback content system during transition
- Gracefully handle both old and new API shapes
- Provide clear error messages during migration period

### Deployment Approach
- Deploy changes incrementally to test each API separately
- Monitor error rates and fallback usage
- Provide clear documentation for users about Chrome AI requirements

## Performance Considerations

### Session Reuse
- Implement session pooling for frequently used AI operations
- Cache availability checks to reduce API calls
- Optimize session creation timing

### Memory Management
- Ensure proper session cleanup to prevent memory leaks
- Implement session timeout mechanisms
- Monitor memory usage during long-running sessions

### Network Optimization
- Handle model download progress appropriately
- Implement retry mechanisms for failed API calls
- Cache translation results when appropriate