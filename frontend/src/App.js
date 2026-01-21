import { useState, useEffect } from 'react';
import './App.css';
import LoadingWorld from './components/LoadingWorld';
import WorldScene from './components/WorldScene';

function App() {
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'loading' | 'world'
  const [showInputs, setShowInputs] = useState(false);
  const [worldName, setWorldName] = useState('');
  const [worldDescription, setWorldDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [worldId, setWorldId] = useState(null);
  const [sceneConfig, setSceneConfig] = useState(null);
  const [characterConfig, setCharacterConfig] = useState(null);
  const [objectives, setObjectives] = useState([]);
  const [score, setScore] = useState(0);
  const [worlds, setWorlds] = useState([]);
  const [editingWorld, setEditingWorld] = useState(null);

  // Fetch all worlds on component mount
  useEffect(() => {
    fetchWorlds();
  }, []);

  const fetchWorlds = async () => {
    try {
      const response = await fetch('/api/worlds');
      const data = await response.json();
      if (response.ok) {
        setWorlds(data.worlds || []);
      }
    } catch (error) {
      console.error('Error fetching worlds:', error);
    }
  };

  const handleToggleInputs = () => {
    setShowInputs(!showInputs);
    setEditingWorld(null);
    setWorldName('');
    setWorldDescription('');
    setMessage({ text: '', type: '' });
  };

  const handleEditWorld = (world) => {
    setEditingWorld(world);
    setWorldName(world.name);
    setWorldDescription(world.description);
    setShowInputs(true);
    setMessage({ text: '', type: '' });
  };

  const handleDeleteWorld = async (worldId) => {
    if (!window.confirm('Are you sure you want to delete this world? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/worlds/${worldId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage({ text: 'World deleted successfully', type: 'success' });
        fetchWorlds();
      } else {
        const data = await response.json();
        setMessage({ text: data.error || 'Failed to delete world', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Error connecting to server', type: 'error' });
    }
  };

  const handlePlayWorld = async (world) => {
    if (!world.scene_config || !world.character_config) {
      setMessage({ text: 'This world has not been generated yet', type: 'error' });
      return;
    }

    try {
      setWorldId(world.id);
      setSceneConfig(JSON.parse(world.scene_config));
      setCharacterConfig(JSON.parse(world.character_config));
      setObjectives(world.objectives ? JSON.parse(world.objectives) : []);
      setScore(world.score || 0);
      setCurrentView('world');
    } catch (error) {
      setMessage({ text: 'Error loading world', type: 'error' });
    }
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
      if (editingWorld) {
        // Update existing world
        const response = await fetch(`/api/worlds/${editingWorld.id}`, {
          method: 'PATCH',
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
          setMessage({ text: 'World updated successfully', type: 'success' });
          fetchWorlds();
          setEditingWorld(null);
          setWorldName('');
          setWorldDescription('');
          setShowInputs(false);
        } else {
          setMessage({ text: data.error || 'Failed to update world', type: 'error' });
        }
      } else {
        // Create new world
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
          const createdWorldId = data.world.id;
          setWorldId(createdWorldId);
          
          // Step 2: Switch to loading view
          setCurrentView('loading');
          
          // Step 3: Generate the scene
          const sceneResponse = await fetch('/api/worlds/generate-scene', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              worldId: createdWorldId,
            }),
          });

          const sceneData = await sceneResponse.json();

          if (sceneResponse.ok) {
            setSceneConfig(sceneData.scene_config);
            setCharacterConfig(sceneData.character_config);
            setObjectives(sceneData.objectives || []);
            setScore(0);
            
            // Step 4: Switch to world view
            setCurrentView('world');
            
            // Clear form
            setWorldName('');
            setWorldDescription('');
            fetchWorlds();
          } else {
            setMessage({ text: sceneData.error || 'Failed to generate scene', type: 'error' });
            setCurrentView('home');
          }
        } else {
          setMessage({ text: data.error || 'Failed to create world', type: 'error' });
        }
      }
    } catch (error) {
      setMessage({ text: 'Error connecting to server', type: 'error' });
      setCurrentView('home');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExitWorld = () => {
    setCurrentView('home');
    setSceneConfig(null);
    setCharacterConfig(null);
    setWorldId(null);
    setShowInputs(false);
    setMessage({ text: '', type: '' });
  };

  // Render based on current view
  if (currentView === 'loading') {
    return <LoadingWorld />;
  }

  if (currentView === 'world' && sceneConfig && characterConfig) {
    return (
      <WorldScene
        sceneConfig={sceneConfig}
        characterConfig={characterConfig}
        worldId={worldId}
        initialObjectives={objectives}
        initialScore={score}
        onExit={handleExitWorld}
      />
    );
  }

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
          {editingWorld ? 'Cancel Edit' : 'Create New World'}
        </button>

        {showInputs && (
          <div className="input-section">
            {editingWorld && (
              <div className="edit-banner">
                Editing: {editingWorld.name}
              </div>
            )}
            
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
              {isSubmitting ? (editingWorld ? 'Updating...' : 'Creating...') : (editingWorld ? 'Update World' : 'Create World')}
            </button>

            {message.text && (
              <div className={`message ${message.type}`}>
                {message.text}
              </div>
            )}
          </div>
        )}

        {/* Previous Worlds */}
        {worlds.length > 0 && (
          <div className="worlds-section">
            <h2 className="worlds-title">Your Worlds</h2>
            <div className="worlds-grid">
              {worlds.map((world) => (
                <div key={world.id} className="world-card">
                  <div className="world-card-header">
                    <h3 className="world-card-title">{world.name}</h3>
                    <div className="world-card-date">
                      {new Date(world.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <p className="world-card-description">
                    {world.description.length > 100 
                      ? world.description.substring(0, 100) + '...' 
                      : world.description}
                  </p>
                  <div className="world-card-stats">
                    <span className="world-stat">Score: {world.score || 0}</span>
                    {world.objectives && JSON.parse(world.objectives).length > 0 && (
                      <span className="world-stat">
                        Objectives: {JSON.parse(world.objectives).filter(o => o.completed).length}/{JSON.parse(world.objectives).length}
                      </span>
                    )}
                  </div>
                  <div className="world-card-actions">
                    {world.scene_config && world.character_config ? (
                      <button 
                        className="world-button world-button-play"
                        onClick={() => handlePlayWorld(world)}
                      >
                        Play
                      </button>
                    ) : (
                      <span className="world-status">Not Generated</span>
                    )}
                    <button 
                      className="world-button world-button-edit"
                      onClick={() => handleEditWorld(world)}
                    >
                      Edit
                    </button>
                    <button 
                      className="world-button world-button-delete"
                      onClick={() => handleDeleteWorld(world.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {message.text && !showInputs && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
