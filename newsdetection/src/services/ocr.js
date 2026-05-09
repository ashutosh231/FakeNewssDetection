import Tesseract from 'tesseract.js';

/**
 * Extracts text from an image source using Tesseract OCR.
 *
 * @param {File|string} imageSource - The image file or base64 URL to extract text from.
 * @param {function} onProgress - Callback function that receives the extraction progress percentage (0-100).
 * @returns {Promise<{text: string, confidence: number}>} - The extracted raw text and overall confidence.
 */
export const extractTextFromImage = async (imageSource, onProgress) => {
  try {
    const result = await Tesseract.recognize(
      imageSource,
      'eng',
      {
        logger: (m) => {
          if (m.status === 'recognizing text' && onProgress) {
            onProgress(Math.round(m.progress * 100));
          }
        },
      }
    );
    
    return {
      text: result.data.text,
      confidence: result.data.confidence
    };
  } catch (error) {
    console.error("OCR Error:", error);
    throw new Error('Unable to clearly extract text from image. Please upload a clearer screenshot.');
  }
};
