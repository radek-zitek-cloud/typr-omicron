import { useState, useEffect, useMemo } from 'react';
import { useAppContext } from './AppContext';
import { getAvailableMonospacedFonts } from './fontDetection';
import './Settings.css';

/**
 * Settings component provides user customization options.
 * Includes font family/size selection and custom word source management.
 */
function Settings() {
  const { currentUser, updateUserSettings } = useAppContext();
  const [pasteText, setPasteText] = useState('');
  const [fonts, setFonts] = useState([]);
  
  // Load available monospaced fonts (async because of Font Access API)
  useEffect(() => {
    getAvailableMonospacedFonts().then(loadedFonts => {
      setFonts(loadedFonts);
    }).catch(error => {
      console.error('Error loading fonts:', error);
      setFonts([{ value: 'monospace', label: 'Monospace' }]);
    });
  }, []);

  const fontSizes = [
    { value: 'S', label: 'Small' },
    { value: 'M', label: 'Medium' },
    { value: 'L', label: 'Large' }
  ];

  const handleFontChange = (e) => {
    updateUserSettings({ font: e.target.value });
  };

  const handleFontSizeChange = (size) => {
    updateUserSettings({ fontSize: size });
  };

  const handleSoundToggle = (e) => {
    updateUserSettings({ soundEnabled: e.target.checked });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (Array.isArray(data)) {
          localStorage.setItem('typr_custom_words', JSON.stringify(data));
          alert(`Loaded ${data.length} custom words!`);
        } else {
          alert('Invalid format. Expected a JSON array of words.');
        }
      } catch (error) {
        alert('Error parsing JSON file: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  const handlePasteText = () => {
    if (pasteText.trim()) {
      const words = pasteText.trim().split(/\s+/);
      localStorage.setItem('typr_custom_words', JSON.stringify(words));
      alert(`Loaded ${words.length} words from pasted text!`);
      setPasteText('');
    }
  };

  return (
    <div className="settings">
      <div className="header">
        <h1>Settings</h1>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <h2>Visual Customization</h2>
          
          <div className="setting-item">
            <label htmlFor="font-select">Font Family:</label>
            <select
              id="font-select"
              value={currentUser?.settings.font || 'Courier New'}
              onChange={handleFontChange}
              className="setting-select"
            >
              {fonts.map(font => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>

          <div className="setting-item">
            <label>Font Size:</label>
            <div className="size-buttons">
              {fontSizes.map(size => (
                <button
                  key={size.value}
                  className={currentUser?.settings.fontSize === size.value ? 'active' : ''}
                  onClick={() => handleFontSizeChange(size.value)}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2>Audio Feedback</h2>
          
          <div className="setting-item">
            <label htmlFor="sound-toggle">
              <input
                type="checkbox"
                id="sound-toggle"
                checked={currentUser?.settings.soundEnabled || false}
                onChange={handleSoundToggle}
              />
              <span style={{ marginLeft: '8px' }}>Enable sound effects</span>
            </label>
            <p className="help-text">
              Play sound when keys are pressed (different sounds for correct and incorrect keys)
            </p>
          </div>
        </div>

        <div className="settings-section">
          <h2>Word Source Management</h2>
          
          <div className="setting-item">
            <h3>Upload Custom Word List (JSON)</h3>
            <p className="help-text">
              Upload a JSON file containing an array of words. Example: ["word1", "word2", "word3"]
            </p>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="file-input"
            />
          </div>

          <div className="setting-item">
            <h3>Paste Custom Text</h3>
            <p className="help-text">
              Paste any text and it will be split into words for practice.
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste your text here..."
              rows={5}
              className="paste-textarea"
            />
            <button onClick={handlePasteText} className="paste-btn">
              Load Pasted Text
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h2>User Profile</h2>
          <div className="setting-item">
            <p><strong>Current User:</strong> {currentUser?.username || 'Guest'}</p>
            <p className="help-text">
              Switch users using the dropdown in the navigation bar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
