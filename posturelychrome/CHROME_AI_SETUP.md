# Chrome AI Translation Setup Guide

## Current Status
❌ **Translation features are not available** - Chrome AI Origin Trial translator API is not enabled. Only English is supported at this time.

## Required Setup Steps

### 1. Join Chrome AI Early Preview Program
1. Visit: https://docs.google.com/forms/d/e/1FAIpQLSfZXeiwj9KO9jMctffHPym88ln12xNWCrVkMY_u06WfSTulQg/viewform
2. Fill out the form to request access
3. Wait for approval (may take several days)

### 2. Enable Chrome Flags
1. Open Chrome and go to: `chrome://flags/`
2. Search for and enable these flags:
   - `#optimization-guide-on-device-model` → **Enabled**
   - `#prompt-api-for-gemini-nano` → **Enabled**
   - `#translation-api` → **Enabled** (if available)
3. Restart Chrome

### 3. Get Origin Trial Token
1. Visit: https://developer.chrome.com/origintrials/
2. Register for the **"Prompt API for Gemini Nano"** trial
3. Add your extension ID: `[Your Extension ID Here]`
4. Copy the generated token

### 4. Update Manifest
1. Open `manifest.json`
2. Replace the empty `trial_tokens` array with your token:
```json
"trial_tokens": [
  "YOUR_ACTUAL_TOKEN_HERE"
]
```

### 5. Verify Setup
1. Reload the extension
2. Open the sidepanel
3. Check if translation options are available
4. Test downloading a language model

## Troubleshooting

### Error: "Chrome AI Origin Trial translator API is not enabled"
- Ensure you've completed all steps above
- Check that Chrome version is 127 or higher
- Verify the Origin Trial token is valid and not expired
- Make sure you're using HTTPS (secure context)

### Error: "Translation features are not available"
- Check Chrome flags are enabled
- Restart Chrome after enabling flags
- Ensure you're approved for the Early Preview Program

### Error: "Your browser doesn't support the Translator API"
- Update Chrome to the latest version (127+)
- Check if your device meets minimum requirements
- Try on a different device/platform

## Testing Translation API
You can test if the API is working by opening the browser console and running:
```javascript
console.log('Translator available:', 'Translator' in self);
console.log('LanguageDetector available:', 'LanguageDetector' in self);
```

## Alternative: English-Only Mode
If you cannot set up the Chrome AI features, the extension will work in English-only mode with all core posture tracking functionality available.

## Resources
- [Chrome AI Documentation](https://developer.chrome.com/docs/ai/)
- [Origin Trials Guide](https://developer.chrome.com/docs/web-platform/origin-trials/)
- [Translation API Demo](https://github.com/GoogleChromeLabs/web-ai-demos/tree/main/translation-language-detection-api-playground)