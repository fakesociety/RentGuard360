/**
 * Contract Text Processor
 * Cleans OCR-extracted text and fixes number positioning
 */

// Noise patterns to filter out
const NOISE_PATTERNS = [
    /^scanned\s+with/i,
    /camscanner/i,
    /^cs$/i,
    /^\.?[A-Za-z]\.?[A-Za-z]?\.?$/,
    /^[.\-_\s]+$/,
    /^ת\.ז\.?\s*$/,
    /^בין:?\s*$/,
    /^לבין:?\s*$/,
];

/**
 * Check if a line is OCR noise
 */
const isNoiseLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) return true;
    return NOISE_PATTERNS.some(pattern => pattern.test(trimmed));
};

/**
 * Fix clause numbering - move numbers from end to beginning
 * Handles patterns like: "מטרת השכירות: .3" -> "3. מטרת השכירות:"
 * And: "השוכרים מתחייבים... 3.1" -> "3.1 השוכרים מתחייבים..."
 */
const fixClauseNumbering = (clause) => {
    if (!clause || typeof clause !== 'string') return clause;

    let text = clause.trim();

    // Pattern 1: Number at end like "...text .3" or "...text 3.1"
    // Match: space + optional period + number(s) at end
    const endNumberPattern = /^(.+?)\s+(\.?\d+(?:\.\d+)*)\s*$/;
    const match = text.match(endNumberPattern);

    if (match) {
        const content = match[1].trim();
        let number = match[2].trim();

        // Clean up the number (remove leading period, add trailing period if needed)
        number = number.replace(/^\./, '');
        if (!number.includes('.') && !number.endsWith('.')) {
            number = number + '.';
        }

        // Move number to beginning
        text = `${number} ${content}`;
    }

    // Pattern 2: Fix ".3 text" to "3. text" (period before number)
    text = text.replace(/^\.(\d+)\s+/, '$1. ');

    return text;
};

/**
 * Process clauses from backend - TRUST the backend structure
 * Only filter noise and fix number positioning
 */
export const processContractClauses = (clauses) => {
    if (!clauses || !Array.isArray(clauses)) return [];

    return clauses
        .filter(clause => {
            if (typeof clause !== 'string') return false;
            const trimmed = clause.trim();
            if (trimmed.length < 5) return false;
            return !isNoiseLine(trimmed);
        })
        .map(clause => fixClauseNumbering(clause.trim()));
};

/**
 * Detect primary language of text
 */
export const detectLanguage = (text) => {
    const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
    const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
    return hebrewChars > latinChars ? 'he' : 'en';
};

export default processContractClauses;
