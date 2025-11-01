// Test script to verify Chrome AI API fixes
// Run this in Chrome DevTools console when the extension is loaded

async function testAPIFixes() {
  console.log('🧪 Testing Chrome AI API fixes...');
  
  // Test 1: Summarizer API - Multiple approaches
  console.log('\n1. Testing Summarizer API...');
  
  // Test 1a: Check if API exists
  console.log('1a. Checking API existence...');
  console.log('- self.Summarizer exists:', 'Summarizer' in self);
  console.log('- window.Summarizer exists:', 'Summarizer' in window);
  
  // Test 1b: Availability check
  try {
    if ('Summarizer' in self) {
      console.log('1b. Checking availability...');
      const availability = await self.Summarizer.availability();
      console.log('✅ Summarizer availability:', availability);
      
      if (availability === 'readily' || availability === 'after-download' || 
          availability === 'available' || availability === 'downloadable') {
        // Test 1c: Create session with outputLanguage
        console.log('1c. Creating session with outputLanguage...');
        try {
          const session = await self.Summarizer.create({
            type: 'tldr',
            format: 'plain-text',
            length: 'medium',
            outputLanguage: 'en'
          });
          console.log('✅ Summarizer session created successfully with outputLanguage');
          session.destroy();
        } catch (createError) {
          console.log('❌ Summarizer with outputLanguage failed:', createError.message);
          
          // Test 1d: Fallback without outputLanguage
          console.log('1d. Trying without outputLanguage...');
          try {
            const session = await self.Summarizer.create({
              type: 'tldr',
              format: 'plain-text',
              length: 'medium'
            });
            console.log('✅ Summarizer session created successfully without outputLanguage');
            session.destroy();
          } catch (fallbackError) {
            console.log('❌ Summarizer fallback also failed:', fallbackError.message);
          }
        }
      } else {
        console.log('⚠️ Summarizer not available on this device:', availability);
      }
    } else {
      console.log('⚠️ Summarizer API not available in self');
    }
  } catch (error) {
    console.log('❌ Summarizer availability check failed:', error.message);
  }
  
  // Test 2: Translator availability with parameters
  console.log('\n2. Testing Translator availability with parameters...');
  try {
    if ('Translator' in self) {
      const availability = await self.Translator.availability({
        sourceLanguage: 'en',
        targetLanguage: 'es'
      });
      console.log('✅ Translator.availability() with parameters:', availability);
    } else {
      console.log('⚠️ Translator API not available');
    }
  } catch (error) {
    console.log('❌ Translator availability check failed:', error.message);
  }
  
  // Test 3: Storage check
  console.log('\n3. Testing device storage check...');
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const availableGB = (estimate.quota - estimate.usage) / (1024 * 1024 * 1024);
      console.log('✅ Storage check:', {
        availableGB: Math.round(availableGB * 10) / 10,
        totalGB: Math.round((estimate.quota / (1024 * 1024 * 1024)) * 10) / 10,
        sufficientForAI: availableGB >= 2
      });
    } else {
      console.log('⚠️ Storage API not available');
    }
  } catch (error) {
    console.log('❌ Storage check failed:', error.message);
  }
  
  // Test 4: Error categorization
  console.log('\n4. Testing error categorization...');
  const testErrors = [
    new Error('The device does not have enough space for downloading the on-device model'),
    new Error('Failed to execute \'availability\' on \'Translator\': 1 argument required, but only 0 present'),
    new Error('Origin Trial tokens not configured'),
    new Error('Model download failed')
  ];
  
  // This would need access to AIServicesManager instance to test properly
  console.log('Error categorization test requires AIServicesManager instance');
  
  console.log('\n🎉 API fixes test completed!');
}

// Auto-run if in extension context
if (typeof chrome !== 'undefined' && chrome.runtime) {
  testAPIFixes().catch(console.error);
} else {
  console.log('Run testAPIFixes() in extension context to test the fixes');
}