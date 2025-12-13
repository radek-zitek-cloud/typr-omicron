/**
 * Font detection utility for detecting monospaced fonts available in the browser
 */

// Common monospaced fonts to check for
const MONOSPACED_FONTS = [
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
  'Ubuntu Mono',
  'Roboto Mono',
  'Fira Code',
  'Fira Mono',
  'Source Code Pro',
  'Droid Sans Mono',
  'Inconsolata',
  'PT Mono',
  'Noto Mono',
  'Oxygen Mono',
  'SF Mono',
  'JetBrains Mono',
  'Cascadia Code',
  'Cascadia Mono',
  'IBM Plex Mono',
  'Hack',
  'Monospace'
];

/**
 * Detects if a font is available in the browser by comparing width measurements
 * @param {string} fontName - The name of the font to check
 * @returns {boolean} - True if the font is available
 */
function isFontAvailable(fontName) {
  // Use a baseline monospace font that should always be available
  const baselineFont = 'monospace';
  
  // Test string with varying widths in monospace vs proportional
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
  
  // If the font is available and different from baseline, width will differ
  // For fonts that match baseline, we still consider them available
  return testWidth !== baselineWidth || fontName.toLowerCase() === 'monospace';
}

/**
 * Detects all available monospaced fonts from the predefined list
 * @returns {Array<{value: string, label: string}>} - Array of available font objects
 */
export function detectAvailableMonospacedFonts() {
  const availableFonts = [];
  
  for (const fontName of MONOSPACED_FONTS) {
    if (isFontAvailable(fontName)) {
      availableFonts.push({
        value: fontName,
        label: `${fontName}`
      });
    }
  }
  
  // Always ensure at least 'monospace' generic family is available
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
 * @returns {Array<{value: string, label: string}>} - Array of available font objects
 */
let cachedFonts = null;

export function getAvailableMonospacedFonts() {
  if (cachedFonts === null) {
    cachedFonts = detectAvailableMonospacedFonts();
  }
  return cachedFonts;
}
