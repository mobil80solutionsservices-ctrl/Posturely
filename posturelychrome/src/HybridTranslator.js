/**
 * HybridTranslator - Encapsulates translation using Chrome AI when available
 * Falls back gracefully when translation is not available
 */
export default class HybridTranslator {
    constructor(sourceLanguage, targetLanguage) {
        this.supportsOnDevice = window.model !== undefined && window.model.createTranslator !== undefined;
        this.onDeviceTranslatorReady = false;
        this.onDeviceTranslator = undefined;
        this.sourceLanguage = sourceLanguage;
        this.targetLanguage = targetLanguage;
        this.tryCreateTranslator();
    }

    // Tries creating a Translator object for the currently set source / target languages
    tryCreateTranslator() {
        if (this.supportsOnDevice) {
            this.onDeviceTranslatorReady = false;
            const parameters = {sourceLanguage: this.sourceLanguage, targetLanguage: this.targetLanguage};
            window.model?.canTranslate(parameters)
                .then(async modelState => {
                    if (modelState == 'no') {
                        return;
                    }

                    this.onDeviceTranslator = await window.model?.createTranslator(parameters)
                    this.onDeviceTranslatorReady = true;
                });
        }
    }

    // Translates a string between languages using on-device translation when available
    async translate(input) {
        if (input.trim().length === 0) {
            return "";
        }
        
        if (this.supportsOnDevice && this.onDeviceTranslatorReady) {
            let result = await this.onDeviceTranslator?.translate(input);
            if (!result) {
                throw new Error('Failed to translate')
            }
            return result;
        }

        // No fallback server - just return original text
        console.warn(`Translation not available for ${this.sourceLanguage} -> ${this.targetLanguage}`);
        return input;
    }

    // Check if translation is supported
    isSupported() {
        return this.supportsOnDevice;
    }

    // Check if translator is ready
    isReady() {
        return this.onDeviceTranslatorReady;
    }

    // Get status information
    getStatus() {
        return {
            supportsOnDevice: this.supportsOnDevice,
            ready: this.onDeviceTranslatorReady,
            sourceLanguage: this.sourceLanguage,
            targetLanguage: this.targetLanguage
        };
    }
}