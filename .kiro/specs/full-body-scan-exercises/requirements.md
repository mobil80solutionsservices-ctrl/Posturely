# Requirements Document

## Introduction

This specification defines a comprehensive full body scan and guided exercise system for the Posturely Chrome extension. The system will provide users with detailed posture analysis through AI-powered reporting and three guided exercises with audio instruction and real-time pose tracking.

## Glossary

- **Posturely_Extension**: The Chrome extension that tracks user posture using MediaPipe and provides real-time feedback
- **Full_Body_Scanner**: Enhanced scanning system that captures posture data and generates AI-powered reports using Chrome's built-in AI
- **Exercise_System**: Guided exercise module with three specific posture improvement exercises
- **AI_Summarizer**: Chrome's built-in window.ai.summarizer API for generating posture reports
- **Pose_Tracker**: MediaPipe-based system that monitors user pose during exercises
- **Audio_Guide**: Audio instruction system that provides spoken guidance during exercises using audio files from the sounds folder
- **Exercise_Page**: Dedicated HTML page for conducting guided exercises
- **Scan_Page**: Dedicated HTML page for performing full body scans
- **Posture_Metrics**: Calculated measurements including neck tilt, shoulder tilt, spine angle, and slouch count
- **Exercise_Session**: A complete cycle of one guided exercise with audio instructions and pose validation
- **Calibration_Phase**: Initial pose measurement period that establishes baseline for exercise tracking
- **Detection_Mode**: Active monitoring phase during exercises that validates pose positions

## Requirements

### Requirement 1

**User Story:** As a user, I want to perform full body scans on a dedicated page with AI-generated reports, so that I can get comprehensive posture analysis and recommendations.

#### Acceptance Criteria

1. WHEN the user clicks "Take Full Body Scan" in the sidebar, THE Full_Body_Scanner SHALL open a dedicated scan page instead of performing the scan in the sidebar
2. WHEN the scan page loads, THE Full_Body_Scanner SHALL initialize webcam access and display the camera feed
3. WHEN the user initiates a scan, THE Full_Body_Scanner SHALL detect main posture landmarks including shoulders, neck, spine, and hips
4. THE Full_Body_Scanner SHALL calculate Posture_Metrics including neck tilt, shoulder tilt, spine angle, and slouch count
5. WHEN scan data is captured, THE AI_Summarizer SHALL generate a friendly report with "Summary" and "Motivation" sections using Chrome's built-in AI

### Requirement 2

**User Story:** As a user, I want access to guided exercises from the scan page, so that I can improve my posture through structured activities.

#### Acceptance Criteria

1. WHEN the full body scan completes, THE Full_Body_Scanner SHALL display a "Do Guided Exercises" button below the scan results
2. WHEN the user clicks "Do Guided Exercises", THE Exercise_System SHALL open a dedicated exercise page
3. THE Exercise_Page SHALL display three available exercises: "Sit Tall & Breathe", "Neck Rotation (Left-Right)", and "Neck Tilt (Up-Down)"
4. WHEN the user selects an exercise, THE Exercise_System SHALL initialize the selected Exercise_Session with proper audio and pose tracking

### Requirement 3

**User Story:** As a user, I want to perform the "Sit Tall & Breathe" exercise with audio guidance, so that I can improve my sitting posture through meditation.

#### Acceptance Criteria

1. WHEN the user starts "Sit Tall & Breathe", THE Exercise_System SHALL play sittall.mp3 for 5 seconds followed by countdown.mp3 for 3 seconds
2. DURING the audio sequence, THE Pose_Tracker SHALL collect pose measurements every 50ms for Calibration_Phase
3. WHEN countdown completes, THE Exercise_System SHALL wait 2 seconds then capture baseline nose-to-shoulder-center ratio
4. WHEN calibration completes, THE Audio_Guide SHALL play meditationstarted.mp3 for 8 seconds then start 3-minute countdown with looping nature sounds
5. DURING the meditation phase, THE Pose_Tracker SHALL check posture every 200ms and trigger correctposture.mp3 if deviation exceeds 0.05 from baseline for 2+ seconds
6. WHEN the user returns to proper posture, THE Exercise_System SHALL stop correction audio and resume timer
7. WHEN 3 minutes complete, THE Exercise_System SHALL play welldone.mp3 and show completion message

### Requirement 4

**User Story:** As a user, I want to perform "Neck Rotation (Left-Right)" exercise with pose validation, so that I can improve neck mobility through guided movements.

#### Acceptance Criteria

1. WHEN the user starts "Neck Rotation", THE Exercise_System SHALL play neckrotationstarted.mp3 for 5 seconds followed by countdown.mp3 for 3 seconds
2. DURING initialization, THE Pose_Tracker SHALL capture baseline distances from nose to both shoulders
3. WHEN the exercise begins, THE Audio_Guide SHALL play turnlefttillbeep.mp3 for 4 seconds then enter Detection_Mode for left turn
4. WHEN left turn is detected and held for 3 seconds, THE Exercise_System SHALL play beep and transition to right turn phase
5. WHEN transitioning to right turn, THE Audio_Guide SHALL play nowturnright.mp3 for 5 seconds then enter Detection_Mode for right turn
6. WHEN right turn is detected and held for 3 seconds, THE Exercise_System SHALL increment rep counter and return to left turn if reps < 7
7. DURING the first cycle only, THE Audio_Guide SHALL play faceforward.mp3 after left hold and neckrepeat.mp3 after right hold
8. WHEN 7 complete repetitions are achieved, THE Exercise_System SHALL play welldone.mp3 and show completion message

### Requirement 5

**User Story:** As a user, I want to perform "Neck Tilt (Up-Down)" exercise with accurate pose detection, so that I can improve neck flexibility through vertical movements.

#### Acceptance Criteria

1. WHEN the user starts "Neck Tilt", THE Exercise_System SHALL play neckrotationstarted.mp3 for 5 seconds followed by countdown.mp3 for 3 seconds
2. DURING initialization, THE Pose_Tracker SHALL capture baseline nose-to-shoulder-center distance using the same measurement as "Sit Tall & Breathe"
3. WHEN the exercise begins, THE Audio_Guide SHALL play tiltupwardnew.mp3 for 4 seconds then enter Detection_Mode for upward tilt
4. WHEN upward tilt is detected (current distance > baseline × 1.1) and held for 3 seconds, THE Exercise_System SHALL play beep and transition to downward tilt
5. WHEN transitioning to downward tilt, THE Audio_Guide SHALL play tiltdown.mp3 for 5 seconds then enter Detection_Mode for downward tilt
6. WHEN downward tilt is detected (current distance < baseline × 0.9) and held for 3 seconds, THE Exercise_System SHALL increment rep counter and return to upward tilt if reps < 7
7. DURING the first cycle only, THE Audio_Guide SHALL play faceforward.mp3 after upward hold and tiltrepeat.mp3 after downward hold
8. WHEN 7 complete repetitions are achieved, THE Exercise_System SHALL play welldone.mp3 and show completion message

### Requirement 6

**User Story:** As a user, I want consistent pose detection across different devices, so that exercises work reliably regardless of my device type.

#### Acceptance Criteria

1. WHEN detecting left/right turns on iOS devices, THE Pose_Tracker SHALL use standard camera orientation where left increases and right decreases nose-to-shoulder distances
2. WHEN detecting left/right turns on Android devices, THE Pose_Tracker SHALL account for mirrored preview by checking increase on right and decrease on left for left turns
3. THE Pose_Tracker SHALL maintain consistent threshold detection logic across all device types
4. WHEN pose exits the required threshold during hold timer, THE Exercise_System SHALL reset the hold timer and require the user to re-achieve the position
5. THE Exercise_System SHALL provide clear visual feedback when poses are detected correctly and when adjustments are needed

### Requirement 7

**User Story:** As a user, I want seamless navigation between scan and exercise features, so that I can easily access all posture improvement tools.

#### Acceptance Criteria

1. THE Scan_Page SHALL provide clear navigation back to the main extension interface
2. THE Exercise_Page SHALL provide navigation back to the scan page and main extension interface
3. WHEN exercises complete, THE Exercise_System SHALL offer options to repeat exercises or return to scan page
4. THE Exercise_System SHALL maintain session state and allow users to pause and resume exercises if needed
5. WHEN users navigate away from exercise pages, THE Exercise_System SHALL properly clean up camera and audio resources