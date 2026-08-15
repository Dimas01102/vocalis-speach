export function validateText(text, maxLength = 5000) {
    if (!text || typeof text !== 'string') {
        return { valid: false, error: 'Text input cannot be empty.' };
    }
    const trimmed = text.trim();
    if (trimmed.length === 0) {
        return { valid: false, error: 'Text input cannot be empty.' };
    }
    if (trimmed.length > maxLength) {
        return { valid: false, error: `Text exceeds maximum length of ${maxLength} characters.` };
    }
    return { valid: true, error: null };
}