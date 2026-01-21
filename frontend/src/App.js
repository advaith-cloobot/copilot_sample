import { useState } from 'react';
import './App.css';

function App() {
  const [showInputs, setShowInputs] = useState(false);
  const [worldName, setWorldName] = useState('');
  const [worldDescription, setWorldDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleToggleInputs = () => {
    setShowInputs(!showInputs);
    setMessage({ text: '', type: '' });
  };

  const handleCreateWorld = async () => {
    // Validation
    if (!worldName.trim()) {
      setMessage({ text: 'Please enter a world name', type: 'error' });
      return;
    }
    
    if (!worldDescription.trim()) {
      setMessage({ text: 'Please enter a world description', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setMessage({ text: '', type: '' });

    try {
      const response = await fetch('/api/worlds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: worldName,
          description: worldDescription,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ text: 'World created successfully!', type: 'success' });
        setWorldName('');
        setWorldDescription('');
        setTimeout(() => {
          setMessage({ text: '', type: '' });
        }, 3000);
      } else {
        setMessage({ text: data.error || 'Failed to create world', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Error connecting to server', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="App">
      <div className="scroll-container">
        <div className="scroll">
          <h1 className="scroll-title">Create Your Own Game World</h1>
        </div>
      </div>

      <div className="content-container">
        <button 
          className="toggle-button" 
          onClick={handleToggleInputs}
        >
          Enter your World Characteristics
        </button>

        {showInputs && (
          <div className="input-section">
            <div className="input-group">
              <label htmlFor="worldName">World Name:</label>
              <input
                id="worldName"
                type="text"
                className="world-input"
                placeholder="Enter your world name..."
                value={worldName}
                onChange={(e) => setWorldName(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="input-group">
              <label htmlFor="worldDescription">World Description:</label>
              <textarea
                id="worldDescription"
                className="world-input world-textarea"
                placeholder="Describe your game world and its characteristics..."
                value={worldDescription}
                onChange={(e) => setWorldDescription(e.target.value)}
                disabled={isSubmitting}
                rows="6"
              />
            </div>

            <button 
              className="create-button" 
              onClick={handleCreateWorld}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create World'}
            </button>

            {message.text && (
              <div className={`message ${message.type}`}>
                {message.text}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
