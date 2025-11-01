# Posturely Chrome Extension

A Chrome extension that provides real-time posture tracking and full body scanning using computer vision.

## Features

- **Real-time Posture Tracking**: Monitor your posture while working with live feedback
- **Full Body Scan**: Capture and analyze your body posture with skeletal overlay
- **Visual Feedback**: Color-coded posture scores (Green: Good, Orange: Fair, Red: Poor)
- **Auto-calibration**: Automatically sets baseline posture for accurate tracking
- **Camera Overlay**: Shows pose landmarks and skeleton on top of camera feed
- **AI-Powered Insights**: Intelligent posture summaries and motivational messages (requires Chrome AI setup)
- **Multi-language Support**: Translation support for multiple languages (requires Chrome AI setup)
- **Smart Break Reminders**: AI-generated personalized break reminders

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `posturelychrome` folder
4. The Posturely extension icon should appear in your toolbar

## Usage

### Posture Tracking
1. Click the Posturely extension icon
2. Click "Start Posture Tracking"
3. Allow camera permissions when prompted
4. Position yourself in front of the camera
5. The extension will show your posture score in real-time
6. Click "Stop" to end tracking

### Full Body Scan
1. Click the Posturely extension icon
2. Click "Full Body Scan"
3. Allow camera permissions when prompted
4. Position yourself in front of the camera
5. Click "Capture" to save the scan image
6. The image will be downloaded to your Downloads folder

## Setup Instructions

For best results:
- Position camera at 45° angle on either side
- Keep device steady and mounted
- Ensure good lighting with face clearly visible
- Stay arm's length away from camera
- Sit or stand naturally

## Technical Details

- Uses MediaPipe Pose for pose detection
- Real-time pose landmark detection (33 key points)
- Posture scoring based on shoulder alignment, spine alignment, and head position
- Canvas-based overlay rendering
- Chrome extension manifest v3 compliant

## Chrome AI Features (Optional)

This extension includes optional AI-powered features that enhance the posture tracking experience:

- **Intelligent Summaries**: AI-generated summaries of your posture sessions
- **Motivational Messages**: Personalized encouragement based on your performance
- **Multi-language Support**: Automatic translation of content to your preferred language
- **Smart Break Reminders**: Context-aware break suggestions

### Chrome AI Setup

To enable AI features, you need Chrome Canary/Dev with Chrome's built-in AI:

1. **Join Early Preview Program**: [Chrome Built-in AI Early Preview Program](https://docs.google.com/forms/d/e/1FAIpQLSfZXeiwj9KO9jMctffHPym88ln12xNWCrVkMY_u06WfSTulQg/viewform)
2. **Enable Chrome Flags**: Go to `chrome://flags/` and enable:
   - `#optimization-guide-on-device-model`
   - `#prompt-api-for-gemini-nano`
   - `#summarization-api-for-gemini-nano`
   - `#translation-api`
3. **Configure Origin Trial**: See [CHROME_AI_SETUP.md](CHROME_AI_SETUP.md) for detailed instructions
4. **Restart Chrome**: Restart your browser after making changes

**Note**: AI features are experimental and require Chrome Canary/Dev. The extension works fully without AI features using fallback content.

## Browser Compatibility

- Chrome 88+ (basic features)
- Chrome Canary/Dev 127+ (AI features)
- Edge 88+ (basic features)
- Other Chromium-based browsers (basic features)

## Privacy

- All processing happens locally in your browser
- No data is sent to external servers
- Camera access is only used when actively tracking
- Images are only saved locally when you choose to capture

## Troubleshooting

### Basic Features
- **Camera not working**: Ensure camera permissions are granted
- **Poor tracking**: Check lighting and camera positioning
- **Extension not loading**: Verify developer mode is enabled
- **Performance issues**: Close other camera-using applications

### AI Features
- **"AI features not available" message**: Check Chrome AI setup requirements
- **Translation not working**: Ensure Chrome AI flags are enabled and Origin Trial is configured
- **Generic motivational messages**: AI features may not be properly configured
- **Setup guide not opening**: Check if CHROME_AI_SETUP.md file exists in extension folder

For detailed AI troubleshooting, see [CHROME_AI_SETUP.md](CHROME_AI_SETUP.md).

## Development

Built with:
- Chrome Extension Manifest V3
- MediaPipe Pose API
- HTML5 Canvas
- Vanilla JavaScript
