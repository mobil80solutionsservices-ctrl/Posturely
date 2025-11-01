# Chrome AI API Implementation Fixes - Requirements Document

## Introduction

The posturelychrome extension currently has incorrect implementations of Chrome's built-in AI APIs. After comparing with the official web-ai-demos examples, several critical issues need to be fixed to ensure proper functionality with Chrome's Prompt API, Summarizer API, Translator API, and Writer/Rewriter APIs.

## Glossary

- **Chrome AI APIs**: Chrome's built-in AI capabilities including LanguageModel (Prompt API), Summarizer, Translator, Writer, and Rewriter
- **AIServicesManager**: The main class coordinating Chrome AI API usage in posturelychrome
- **LanguageModelManager**: The class handling translation model downloads and language management
- **Global API Access**: Chrome AI APIs are accessed via global objects (self.LanguageModel, self.Summarizer, etc.) not chrome.ai.*
- **Session Management**: Proper creation, usage, and cleanup of AI API sessions
- **API Availability Check**: Correct method to check if APIs are available on the device
- **Origin Trial**: Chrome's mechanism for enabling experimental APIs

## Requirements

### Requirement 1: Fix Global API Access Pattern

**User Story:** As a developer, I want the Chrome AI APIs to be accessed correctly so that the extension works with Chrome's actual API implementation.

#### Acceptance Criteria

1. WHEN checking API availability, THE AIServicesManager SHALL use global objects (self.LanguageModel, self.Summarizer, self.Translator) instead of chrome.ai.*
2. WHEN creating AI sessions, THE AIServicesManager SHALL call global constructors (LanguageModel.create(), Summarizer.create(), Translator.create()) instead of chrome.ai.*.create()
3. WHEN checking API support, THE AIServicesManager SHALL use proper availability methods (LanguageModel.availability(), Summarizer.availability(), Translator.availability())
4. WHERE Writer/Rewriter functionality is needed, THE AIServicesManager SHALL use self.Writer and self.Rewriter global objects
5. THE AIServicesManager SHALL remove all references to chrome.ai.* API patterns

### Requirement 2: Implement Correct Availability Checking

**User Story:** As a user, I want the extension to properly detect when Chrome AI features are available so that I get appropriate feedback about feature availability.

#### Acceptance Criteria

1. WHEN checking LanguageModel availability, THE AIServicesManager SHALL call LanguageModel.availability() and check for 'readily' or 'after-download' status
2. WHEN checking Summarizer availability, THE AIServicesManager SHALL call Summarizer.availability() and check for 'readily' or 'after-download' status  
3. WHEN checking Translator availability, THE AIServicesManager SHALL call Translator.availability() with language pair parameters
4. IF an API returns 'no' availability, THEN THE AIServicesManager SHALL disable that feature and show appropriate user messaging
5. THE AIServicesManager SHALL handle API availability checks gracefully with proper error handling

### Requirement 3: Fix Session Creation and Management

**User Story:** As a user, I want AI-generated content to work reliably so that I receive proper summaries and motivational messages.

#### Acceptance Criteria

1. WHEN creating a LanguageModel session, THE AIServicesManager SHALL use LanguageModel.create() with proper options (temperature, topK, initialPrompts)
2. WHEN creating a Summarizer session, THE AIServicesManager SHALL use Summarizer.create() with type, format, and length options
3. WHEN creating a Translator session, THE AIServicesManager SHALL use Translator.create() with sourceLanguage and targetLanguage options
4. WHEN using Writer functionality, THE AIServicesManager SHALL create Writer sessions with Writer.create() and proper options
5. THE AIServicesManager SHALL properly destroy sessions after use to prevent memory leaks

### Requirement 4: Update Translation Model Management

**User Story:** As a user, I want translation features to work correctly so that I can use the extension in my preferred language.

#### Acceptance Criteria

1. WHEN checking translation model availability, THE LanguageModelManager SHALL use Translator.availability() instead of chrome.ai.translator.capabilities()
2. WHEN downloading translation models, THE LanguageModelManager SHALL use Translator.create() which triggers automatic model download
3. WHEN testing model availability, THE LanguageModelManager SHALL create and test actual Translator sessions
4. THE LanguageModelManager SHALL handle the case where Translator API is not available in the browser
5. THE LanguageModelManager SHALL provide proper error messages when translation features are unavailable

### Requirement 5: Implement Proper API Detection

**User Story:** As a user, I want clear feedback when Chrome AI features are not available so that I understand why certain features don't work.

#### Acceptance Criteria

1. WHEN the extension loads, THE AIServicesManager SHALL check for global API availability using 'LanguageModel' in self, 'Summarizer' in self, etc.
2. IF Chrome AI APIs are not available, THEN THE AIServicesManager SHALL show appropriate user messaging about joining the Early Preview Program
3. WHEN APIs are available but models need downloading, THE AIServicesManager SHALL handle download progress appropriately
4. THE AIServicesManager SHALL distinguish between API unavailability and model unavailability
5. THE AIServicesManager SHALL provide fallback content when AI features are not available

### Requirement 6: Fix Streaming and Response Handling

**User Story:** As a user, I want AI responses to be processed correctly so that I see properly formatted content.

#### Acceptance Criteria

1. WHEN using LanguageModel streaming, THE AIServicesManager SHALL use session.promptStreaming() and handle chunk processing correctly
2. WHEN using Writer streaming, THE AIServicesManager SHALL use writer.writeStreaming() and handle incremental vs full response patterns
3. WHEN processing Summarizer responses, THE AIServicesManager SHALL use session.summarize() for non-streaming responses
4. THE AIServicesManager SHALL handle both Chrome Stable and Canary API variations for streaming responses
5. THE AIServicesManager SHALL properly handle errors during streaming operations

### Requirement 7: Update Token/Usage Tracking

**User Story:** As a developer, I want proper token usage tracking so that the extension can monitor API usage limits.

#### Acceptance Criteria

1. WHEN tracking input usage, THE AIServicesManager SHALL use session.measureInputUsage() for newer API versions and session.countPromptTokens() for older versions
2. WHEN displaying usage stats, THE AIServicesManager SHALL handle both inputQuota/inputUsage (new) and maxTokens/tokensSoFar (old) properties
3. THE AIServicesManager SHALL calculate tokens left using appropriate properties for each API version
4. THE AIServicesManager SHALL handle cases where usage tracking methods are not available
5. THE AIServicesManager SHALL provide meaningful usage information to users when available

### Requirement 8: Add Origin Trial Configuration

**User Story:** As a user, I want the extension to work with Chrome's Origin Trial system so that I can access experimental AI features.

#### Acceptance Criteria

1. THE manifest.json SHALL include proper trial_tokens configuration for Chrome AI Origin Trial
2. THE extension SHALL provide clear instructions for users on how to enable Chrome AI features
3. WHEN Origin Trial tokens are invalid or expired, THE extension SHALL show appropriate error messages
4. THE extension SHALL gracefully handle the transition from Origin Trial to stable API release
5. THE extension SHALL provide documentation on how to obtain and configure Origin Trial tokens