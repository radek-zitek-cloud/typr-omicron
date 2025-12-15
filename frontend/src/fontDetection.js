/**
 * Modern font detection utility using multiple detection methods
 * Prioritizes browser Font Access API, falls back to canvas-based detection
 */

/**
 * Detects if a font is available using canvas measurement technique
 * @param {string} fontName - The name of the font to check
 * @returns {boolean} - True if the font is available
 */
function isFontAvailableCanvas(fontName) {
  const baselineFont = 'monospace';
  const testString = 'mmmmmmmmmmlli';
  const testSize = '72px';
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  // Measure with baseline font
  context.font = `${testSize} ${baselineFont}`;
  const baselineWidth = context.measureText(testString).width;
  
  // Measure with test font, fallback to baseline
  context.font = `${testSize} "${fontName}", ${baselineFont}`;
  const testWidth = context.measureText(testString).width;
  
  // If widths differ, font is available and different from baseline
  return testWidth !== baselineWidth;
}

/**
 * Check if font is actually monospaced by measuring character widths
 * @param {string} fontName - The name of the font to check
 * @returns {boolean} - True if the font appears to be monospaced
 */
function isMonospacedFont(fontName) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = `16px "${fontName}", monospace`;
  
  // Measure different characters - in monospace they should be identical
  const widthI = context.measureText('i').width;
  const widthM = context.measureText('m').width;
  const widthW = context.measureText('w').width;
  
  // Allow tiny variance for rounding errors
  const tolerance = 0.5;
  return Math.abs(widthI - widthM) < tolerance && Math.abs(widthM - widthW) < tolerance;
}

/**
 * Gets all available system fonts using the Font Access API (if supported)
 * @returns {Promise<Array<string>>} - Array of font family names
 */
async function getSystemFontsViaAPI() {
  try {
    // Check if Font Access API is available
    if ('queryLocalFonts' in window) {
      const fonts = await window.queryLocalFonts();
      
      // Extract unique font families
      const fontFamilies = new Set();
      fonts.forEach(font => {
        if (font.family) {
          fontFamilies.add(font.family);
        }
      });
      
      return Array.from(fontFamilies).sort();
    }
  } catch (error) {
    console.warn('Font Access API error:', error);
  }
  
  return null;
}

/**
 * Common monospaced fonts to check for (fallback list)
 */
const COMMON_MONOSPACED_FONTS = [
  // System fonts
  'Courier New',
  'Courier',
  'Monaco',
  'Menlo',
  'Consolas',
  'Lucida Console',
  'DejaVu Sans Mono',
  'Bitstream Vera Sans Mono',
  'Liberation Mono',
  'Nimbus Mono L',
  'Andale Mono',
  
  // Modern coding fonts
  'Fira Code',
  'Fira Mono',
  'Source Code Pro',
  'Roboto Mono',
  'JetBrains Mono',
  'Cascadia Code',
  'Cascadia Mono',
  'IBM Plex Mono',
  'SF Mono',
  'Hack',
  'Inconsolata',
  'Ubuntu Mono',
  'Droid Sans Mono',
  'PT Mono',
  'Noto Mono',
  'Oxygen Mono',
  
  // Generic fallback
  'monospace'
];

/**
 * Detects all available monospaced fonts
 * Uses Font Access API if available, falls back to canvas detection
 * @returns {Promise<Array<{value: string, label: string}>>} - Array of available font objects
 */
export async function detectAvailableMonospacedFonts() {
  const availableFonts = [];
  
  // Try Font Access API first
  const systemFonts = await getSystemFontsViaAPI();
  
  if (systemFonts && systemFonts.length > 0) {
    console.log(`Detected ${systemFonts.length} system fonts via Font Access API`);
    
    // Filter for monospaced fonts
    for (const fontName of systemFonts) {
      // Check if font name suggests it's monospaced
      const nameSuggestsMono = /mono|code|console|courier|terminal|fixed/i.test(fontName);
      
      // Actually test if it's monospaced
      if (nameSuggestsMono || isMonospacedFont(fontName)) {
        availableFonts.push({
          value: fontName,
          label: fontName
        });
      }
    }
    
    console.log(`Found ${availableFonts.length} monospaced fonts`);
  } else {
    console.log('Font Access API not available, using canvas detection');
    
    // Fallback to canvas-based detection with common fonts
    for (const fontName of COMMON_MONOSPACED_FONTS) {
      if (fontName === 'monospace' || isFontAvailableCanvas(fontName)) {
        availableFonts.push({
          value: fontName,
          label: fontName
        });
      }
    }
  }
  
  // Sort alphabetically, but keep 'monospace' at the end
  availableFonts.sort((a, b) => {
    if (a.value === 'monospace') return 1;
    if (b.value === 'monospace') return -1;
    return a.label.localeCompare(b.label);
  });
  
  // Ensure at least generic monospace is available
  if (availableFonts.length === 0) {
    availableFonts.push({
      value: 'monospace',
      label: 'Monospace (Generic)'
    });
  }
  
  return availableFonts;
}

/**
 * Gets cached available fonts or detects them
 * @returns {Promise<Array<{value: string, label: string}>>} - Array of available font objects
 */
let cachedFonts = null;
let cachePromise = null;

export async function getAvailableMonospacedFonts() {
  if (cachedFonts !== null) {
    return cachedFonts;
  }
  
  // Prevent multiple simultaneous detection calls
  if (cachePromise !== null) {
    return cachePromise;
  }
  
  cachePromise = detectAvailableMonospacedFonts();
  cachedFonts = await cachePromise;
  cachePromise = null;
  
  return cachedFonts;
}

/**
 * Clear cached fonts (useful for testing or if fonts change)
 */
export function clearFontCache() {
  cachedFonts = null;
  cachePromise = null;
}
