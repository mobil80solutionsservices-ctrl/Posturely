# Translation Setup Guide

## Issue
You're seeing the warning "Origin Trial tokens not configured. Chrome AI features may not work" and the interface isn't translating to Hindi or other languages.

## Solution Steps

### 1. Enable Chrome AI Features

**Option A: Use Chrome Canary (Recommended)**
1. Download Chrome Canary from https://www.google.com/chrome/canary/
2. Launch Chrome Canary with these flags:
   ```
   --enable-features=BuiltInAIAPI,PromptAPIForGeminiNano,TranslationAPI
   ```
3. Or enable manually:
   - Go to `chrome://flags`
   - Search for "Built-in AI API" and enable it
   - Search for "Translation API" and enable it
   - Restart Chrome

**Option B: Use Chrome Dev/Beta**
- Similar process but may have limited AI features

### 2. Test Translation API

Open the debug page: `posturelychrome/debug-translation.html`

1. Click "Check Translation API" - should show "✅ Translation API is available!"
2. Click "Test Hindi Translation" - should translate the interface elements
3. Click "Restore English" - should restore original text

### 3. Manual Translation Test

If the automatic translation isn't working, you can test manually:

1. Open the sidepanel
2. Open browser console (F12)
3. Run these commands:

```javascript
// Test if translation service is available
console.log('Localization service:', window.localizationService);

// Force translate to Hindi
await window.testTranslation('hi');

// Restore to English
await window.testTranslation('en');
```

### 4. Troubleshooting

**If you see "Chrome Translator API not available":**
- Make sure you're using Chrome 127+ with AI features enabled
- Try Chrome Canary with the flags mentioned above
- Check if your Chrome version supports built-in AI

**If translation fails with errors:**
- Check the browser console for detailed error messages
- Some languages may not be fully supported yet
- Try Spanish ('es') or French ('fr') which have better support

**If interface doesn't translate automatically:**
- The language change event might not be triggering properly
- Use the manual test commands above
- Check if the LocalizationService is properly initialized

### 5. Supported Languages

Currently working languages (as of Chrome 127+):
- ✅ English (en) - Built-in
- ✅ Spanish (es) - Good support
- ✅ French (fr) - Good support
- ⚠️ Hindi (hi) - Limited support, may require model download
- ⚠️ German (de) - Limited support
- ⚠️ Japanese (ja) - Limited support

### 6. Origin Trial (Optional)

The Origin Trial warning is about advanced AI features. For basic translation, you don't need Origin Trial tokens. However, if you want to set them up:

1. Go to https://developer.chrome.com/origintrials/
2. Register for the "Built-in AI API" trial
3. Add the token to your `manifest.json`:

```json
{
  "trial_tokens": ["your-token-here"]
}
```

### 7. Testing the Fix

After following the steps above:

1. Open the extension sidepanel
2. Click the language toggle (🌐) button
3. Select Hindi or another language
4. The interface should translate automatically
5. All text elements should change to the selected language

### 8. Debug Information

If issues persist, check these files:
- `debug-translation.html` - Basic translation testing
- `test-simple-translation.html` - Direct API testing
- Browser console logs for detailed error messages

The translation system should now work properly with all interface elements translating to your selected language.