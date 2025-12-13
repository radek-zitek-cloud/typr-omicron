import { useAppContext } from './AppContext';
import './ConfigBar.css';

function ConfigBar() {
  const { testConfig, setTestConfig } = useAppContext();

  const timeModes = [
    { label: '15s', value: 15 },
    { label: '30s', value: 30 },
    { label: '60s', value: 60 },
    { label: '120s', value: 120 }
  ];

  const wordModes = [
    { label: '10', value: 10 },
    { label: '25', value: 25 },
    { label: '50', value: 50 },
    { label: '100', value: 100 }
  ];

  const handleModeChange = (mode) => {
    setTestConfig(prev => ({ ...prev, mode }));
  };

  const handleTimeLimitChange = (timeLimit) => {
    setTestConfig(prev => ({ ...prev, timeLimit }));
  };

  const handleWordCountChange = (wordCount) => {
    setTestConfig(prev => ({ ...prev, wordCount }));
  };

  return (
    <div className="config-bar">
      <div className="config-section">
        <div className="mode-toggle">
          <button
            className={testConfig.mode === 'time' ? 'active' : ''}
            onClick={() => handleModeChange('time')}
          >
            Time Mode
          </button>
          <button
            className={testConfig.mode === 'words' ? 'active' : ''}
            onClick={() => handleModeChange('words')}
          >
            Word Count
          </button>
        </div>
      </div>

      {testConfig.mode === 'time' && (
        <div className="config-section">
          <div className="option-buttons">
            {timeModes.map(({ label, value }) => (
              <button
                key={value}
                className={testConfig.timeLimit === value ? 'active' : ''}
                onClick={() => handleTimeLimitChange(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {testConfig.mode === 'words' && (
        <div className="config-section">
          <div className="option-buttons">
            {wordModes.map(({ label, value }) => (
              <button
                key={value}
                className={testConfig.wordCount === value ? 'active' : ''}
                onClick={() => handleWordCountChange(value)}
              >
                {label} words
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ConfigBar;
