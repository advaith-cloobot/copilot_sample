import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import './LoadingWorld.css';

// Rotating globe component
function RotatingGlobe() {
  return (
    <mesh rotation={[0, 0, 0.2]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial 
        color="#4a90e2" 
        emissive="#2563eb"
        emissiveIntensity={0.3}
        roughness={0.7}
        metalness={0.3}
      />
      <pointLight position={[5, 5, 5]} intensity={0.5} />
      <ambientLight intensity={0.4} />
    </mesh>
  );
}

function LoadingWorld() {
  const [messageIndex, setMessageIndex] = useState(0);
  
  const messages = [
    "Conjuring your world...",
    "Summoning characters...",
    "Preparing the realm...",
    "Weaving the fabric of reality..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="loading-world-container">
      <div className="loading-scroll">
        <h2 className="loading-title">Creating Your World</h2>
        
        <div className="globe-container">
          <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
            <RotatingGlobe />
          </Canvas>
        </div>

        <div className="loading-message-container">
          <p className="loading-message">{messages[messageIndex]}</p>
        </div>

        <div className="loading-spinner-container">
          <div className="parchment-spinner"></div>
        </div>
      </div>
    </div>
  );
}

export default LoadingWorld;
