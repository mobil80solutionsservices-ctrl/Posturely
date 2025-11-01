# Implementation Plan

- [x] 1. Fix AIServicesManager API access patterns
  - Replace all chrome.ai.* references with global object access patterns
  - Update API detection to use 'LanguageModel' in self, 'Summarizer' in self, etc.
  - Fix availability checking to use proper *.availability() methods instead of capabilities()
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

- [x] 1.1 Update API detection methods in checkAIAvailability()
  - Change chrome.ai checks to global object checks (self.LanguageModel, self.Summarizer, self.Translator)
  - Remove chrome.ai.* references completely
  - Add proper error handling for missing global objects
  - _Requirements: 1.1, 1.5, 5.1_

- [x] 1.2 Fix availability checking methods
  - Replace chrome.ai.summarizer.capabilities() with Summarizer.availability()
  - Replace chrome.ai.languageModel.capabilities() with LanguageModel.availability()
  - Replace chrome.ai.translator.capabilities() with Translator.availability()
  - Handle 'readily', 'after-download', and 'unavailable' status values correctly
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 1.3 Update session creation methods
  - Fix generatePostureSummary() to use Summarizer.create() instead of chrome.ai.summarizer.create()
  - Fix generateMotivationalMessage() to use LanguageModel.create() instead of chrome.ai.languageModel.create()
  - Fix translateContent() to use Translator.create() instead of chrome.ai.translator.create()
  - Add proper session configuration options (type, format, length for Summarizer; temperature, topK for LanguageModel)
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [x] 1.4 Add Writer/Rewriter API support
  - Implement Writer API detection using 'Writer' in self
  - Implement Rewriter API detection using 'Rewriter' in self
  - Add Writer.create() and Rewriter.create() session creation methods
  - Update generateBreakReminder() to optionally use Writer API
  - _Requirements: 1.4, 3.4_

- [ ]* 1.5 Add comprehensive error handling tests
  - Write unit tests for API detection methods
  - Write unit tests for availability checking methods
  - Write unit tests for session creation error scenarios
  - Write integration tests for fallback content behavior
  - _Requirements: 2.5, 5.2, 5.3_

- [x] 2. Fix LanguageModelManager translation API implementation
  - Update translation API detection to use global Translator object
  - Fix model availability checking to use Translator.availability()
  - Update model download process to use proper Translator.create() pattern
  - Improve error messaging for translation unavailability scenarios
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 2.1 Update translation API detection
  - Replace chrome.ai.translator checks with 'Translator' in self
  - Update isTranslatorAPIAvailable() method to use global object detection
  - Remove chrome.ai references from LanguageModelManager
  - _Requirements: 4.1, 1.5_

- [x] 2.2 Fix model availability checking
  - Replace chrome.ai.translator.capabilities() with Translator.availability()
  - Update checkModelAvailability() to use proper language pair parameters
  - Handle 'unavailable' status correctly for unsupported language pairs
  - Add proper error handling for availability check failures
  - _Requirements: 4.2, 2.4_

- [x] 2.3 Update model download process
  - Replace chrome.ai.translator.create() with Translator.create() in downloadModel()
  - Remove simulated progress tracking since real API handles this
  - Update model testing to use actual Translator sessions
  - Improve error messages for download failures
  - _Requirements: 4.3, 4.5_

- [x] 2.4 Enhance error messaging system
  - Add specific error messages for different unavailability scenarios
  - Distinguish between API unavailability and model unavailability
  - Provide clear guidance for users when features are not available
  - Update user-facing messages to mention Origin Trial requirements
  - _Requirements: 4.4, 4.5, 5.2_

- [ ]* 2.5 Add translation system tests
  - Write unit tests for updated translation API detection
  - Write unit tests for model availability checking
  - Write integration tests for model download process
  - Write tests for error messaging scenarios
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 3. Implement proper streaming and response handling
  - Fix streaming response handling for LanguageModel.promptStreaming()
  - Add support for Writer.writeStreaming() and Rewriter.rewriteStreaming()
  - Handle both Chrome Stable and Canary API response patterns
  - Update token/usage tracking for both old and new API properties
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3_

- [x] 3.1 Fix LanguageModel streaming implementation
  - Update generateMotivationalMessage() to use proper promptStreaming() if needed
  - Handle chunk processing correctly for streaming responses
  - Add error handling for streaming operation failures
  - Support both incremental and full response patterns
  - _Requirements: 6.1, 6.4, 6.5_

- [x] 3.2 Add Writer/Rewriter streaming support
  - Implement Writer.writeStreaming() for content generation
  - Implement Rewriter.rewriteStreaming() for content modification
  - Handle different streaming patterns between Chrome Stable and Canary
  - Add proper error handling for streaming operations
  - _Requirements: 6.2, 6.4, 6.5_

- [x] 3.3 Update token and usage tracking
  - Support both measureInputUsage() (new) and countPromptTokens() (old) methods
  - Handle both inputQuota/inputUsage (new) and maxTokens/tokensSoFar (old) properties
  - Calculate tokens left using appropriate properties for each API version
  - Add fallback behavior when usage tracking is not available
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 3.4 Add streaming and usage tracking tests
  - Write unit tests for streaming response handling
  - Write unit tests for token usage tracking with both API versions
  - Write integration tests for complete streaming workflows
  - Write tests for error scenarios during streaming
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3_

- [x] 4. Update manifest and Origin Trial configuration
  - Add proper Origin Trial token configuration to manifest.json
  - Update extension documentation with Chrome AI setup instructions
  - Add user-facing error messages for Origin Trial issues
  - Implement graceful handling of expired or invalid trial tokens
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 4.1 Configure Origin Trial tokens
  - Research current Chrome AI Origin Trial token requirements
  - Add placeholder trial_tokens configuration to manifest.json
  - Document the process for obtaining and configuring trial tokens
  - Add validation for trial token format and expiration
  - _Requirements: 8.1, 8.5_

- [x] 4.2 Add user guidance and documentation
  - Create user-facing documentation for enabling Chrome AI features
  - Add clear error messages when Origin Trial is not configured
  - Provide step-by-step instructions for joining the Early Preview Program
  - Add troubleshooting guide for common Chrome AI issues
  - _Requirements: 8.2, 8.3_

- [x] 4.3 Implement Origin Trial error handling
  - Detect when Origin Trial tokens are invalid or expired
  - Show appropriate error messages for different Origin Trial issues
  - Provide fallback behavior when Origin Trial features are unavailable
  - Plan for transition from Origin Trial to stable API release
  - _Requirements: 8.3, 8.4_

- [ ]* 4.4 Add Origin Trial configuration tests
  - Write tests for Origin Trial token validation
  - Write tests for error handling with invalid tokens
  - Write tests for fallback behavior when Origin Trial is unavailable
  - Write integration tests for complete Origin Trial workflows
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 5. Integration testing and validation
  - Test complete AI workflows with corrected API implementations
  - Validate fallback content system works when APIs are unavailable
  - Test extension behavior across different Chrome versions (Stable vs Canary)
  - Verify proper session lifecycle management and memory cleanup
  - _Requirements: All requirements integration testing_

- [x] 5.1 End-to-end workflow testing
  - Test complete posture summary generation workflow
  - Test complete motivational message generation workflow
  - Test complete translation workflow with model downloading
  - Verify all workflows handle API unavailability gracefully
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [x] 5.2 Cross-browser compatibility testing
  - Test extension with Chrome Stable (older API shape)
  - Test extension with Chrome Canary (newer API shape)
  - Verify proper handling of API differences between versions
  - Test Origin Trial behavior across different Chrome versions
  - _Requirements: 6.4, 7.1, 7.2, 8.4_

- [x] 5.3 Performance and memory testing
  - Test session creation and cleanup for memory leaks
  - Verify proper session reuse and optimization
  - Test behavior under high API usage scenarios
  - Monitor performance impact of corrected API implementations
  - _Requirements: 3.5, 6.5_

- [ ]* 5.4 Comprehensive integration test suite
  - Write end-to-end tests for all major AI workflows
  - Write tests for cross-browser compatibility scenarios
  - Write performance tests for session management
  - Write tests for complete error handling and fallback scenarios
  - _Requirements: All requirements comprehensive testing_