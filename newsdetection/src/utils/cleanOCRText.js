/**
 * Cleans and normalizes raw text extracted from OCR.
 * Removes excessive spaces, broken symbols, and normalizes line breaks.
 *
 * @param {string} rawText - The raw text output from Tesseract.js
 * @returns {string} - Cleaned and formatted text
 */
export const cleanOCRText = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return '';

  return rawText
    // Remove excessive newlines (more than 2)
    .replace(/\n{3,}/g, '\n\n')
    // Remove excessive spaces
    .replace(/ {2,}/g, ' ')
    // Remove common OCR garbage characters but keep alphanumeric, punctuation, and newlines
    .replace(/[^\x20-\x7E\n]/g, '')
    // Fix isolated letters that were likely noise, except valid words like "a" or "I"
    .replace(/\b[^aAiI\d\n]\b/g, '')
    // Clean up spaces before punctuation
    .replace(/ \./g, '.')
    .replace(/ ,/g, ',')
    // Final trim
    .trim();
};
