import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sky } from '@react-three/drei';
import { Physics, RigidBody, CapsuleCollider } from '@react-three/rapier';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import './WorldScene.css';

// Humanoid Character Mesh Component (visual only)
function CharacterMesh({ config }) {
  const body = config?.body || { height: 1.7, build: 'average', skinTone: '#f4c2a5' };
  const head = config?.head || { hairStyle: 'short', hairColor: '#4a3728', facialHair: 'none' };
  const clothing = config?.clothing || {
    top: { type: 'shirt', color: '#6b8e23' },
    bottom: { type: 'pants', color: '#4a4a4a' },
    footwear: { type: 'shoes', color: '#2c2c2c' }
  };
  const accessories = config?.accessories || [];

  const headSize = 0.15 * body.height;
  const torsoHeight = 0.35 * body.height;
  const torsoWidth = body.build === 'muscular' ? 0.25 : body.build === 'slim' ? 0.18 : 0.22;
  const limbWidth = 0.06 * body.height;

  return (
    <group position={[0, torsoHeight / 2, 0]}>
      {/* Head */}
      <mesh position={[0, torsoHeight / 2 + headSize, 0]}>
        <sphereGeometry args={[headSize, 16, 16]} />
        <meshStandardMaterial color={body.skinTone} />
      </mesh>

      {/* Hair */}
      {head.hairStyle !== 'bald' && (
        <mesh position={[0, torsoHeight / 2 + headSize * 1.2, 0]}>
          <sphereGeometry args={[headSize * 0.9, 16, 16]} />
          <meshStandardMaterial color={head.hairColor} />
        </mesh>
      )}

      {/* Torso */}
      <mesh>
        <boxGeometry args={[torsoWidth, torsoHeight, torsoWidth * 0.6]} />
        <meshStandardMaterial color={clothing.top.color} />
      </mesh>

      {/* Left Arm */}
      <mesh position={[-torsoWidth * 0.6, torsoHeight * 0.1, 0]}>
        <cylinderGeometry args={[limbWidth, limbWidth, torsoHeight * 0.6, 8]} />
        <meshStandardMaterial color={body.skinTone} />
      </mesh>

      {/* Right Arm */}
      <mesh position={[torsoWidth * 0.6, torsoHeight * 0.1, 0]}>
        <cylinderGeometry args={[limbWidth, limbWidth, torsoHeight * 0.6, 8]} />
        <meshStandardMaterial color={body.skinTone} />
      </mesh>

      {/* Left Leg */}
      <mesh position={[-torsoWidth * 0.25, -torsoHeight * 0.7, 0]}>
        <cylinderGeometry args={[limbWidth, limbWidth, torsoHeight * 0.9, 8]} />
        <meshStandardMaterial color={clothing.bottom.color} />
      </mesh>

      {/* Right Leg */}
      <mesh position={[torsoWidth * 0.25, -torsoHeight * 0.7, 0]}>
        <cylinderGeometry args={[limbWidth, limbWidth, torsoHeight * 0.9, 8]} />
        <meshStandardMaterial color={clothing.bottom.color} />
      </mesh>

      {/* Accessories */}
      {accessories.slice(0, 3).map((accessory, index) => (
        <mesh key={index} position={[0, torsoHeight / 2 + headSize * 1.8, 0]}>
          <boxGeometry args={[headSize * 0.8, headSize * 0.3, headSize * 0.8]} />
          <meshStandardMaterial color={accessory.color || '#8b4513'} />
        </mesh>
      ))}
    </group>
  );
}

// Old Character component - kept for NPCs
function Character({ config, isPlayer = false, emissive = '#000000', emissiveIntensity = 0 }) {
  const characterRef = useRef();
  const [velocity, setVelocity] = useState({ x: 0, z: 0 });
  const keysPressed = useRef({ ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false });

  // Parse character configuration
  const body = config?.body || { height: 1.7, build: 'average', skinTone: '#f4c2a5' };
  const head = config?.head || { hairStyle: 'short', hairColor: '#4a3728', facialHair: 'none' };
  const clothing = config?.clothing || {
    top: { type: 'shirt', color: '#6b8e23' },
    bottom: { type: 'pants', color: '#4a4a4a' },
    footwear: { type: 'shoes', color: '#2c2c2c' }
  };
  const accessories = config?.accessories || [];

  const headSize = 0.15 * body.height;
  const torsoHeight = 0.35 * body.height;
  const torsoWidth = body.build === 'muscular' ? 0.25 : body.build === 'slim' ? 0.18 : 0.22;
  const limbWidth = 0.06 * body.height;

  // Keyboard controls for player
  useEffect(() => {
    if (!isPlayer) return;

    const handleKeyDown = (e) => {
      if (e.key in keysPressed.current) {
        keysPressed.current[e.key] = true;
      }
    };

    const handleKeyUp = (e) => {
      if (e.key in keysPressed.current) {
        keysPressed.current[e.key] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlayer]);

  useFrame(() => {
    if (!characterRef.current || !isPlayer) return;

    const speed = 3;
    let vx = 0;
    let vz = 0;

    if (keysPressed.current.ArrowUp) vz -= speed;
    if (keysPressed.current.ArrowDown) vz += speed;
    if (keysPressed.current.ArrowLeft) vx -= speed;
    if (keysPressed.current.ArrowRight) vx += speed;

    characterRef.current.setLinvel({ x: vx, y: characterRef.current.linvel().y, z: vz }, true);
  });

  return (
    <RigidBody
      ref={characterRef}
      colliders={false}
      enabledRotations={[false, true, false]}
      linearDamping={0.5}
    >
      <CapsuleCollider args={[torsoHeight / 2, torsoWidth / 2]} />
      
      <group position={[0, torsoHeight / 2, 0]}>
        {/* Head */}
        <mesh position={[0, torsoHeight / 2 + headSize, 0]}>
          <sphereGeometry args={[headSize, 16, 16]} />
          <meshStandardMaterial 
            color={body.skinTone} 
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>

        {/* Hair */}
        {head.hairStyle !== 'bald' && (
          <mesh position={[0, torsoHeight / 2 + headSize * 1.2, 0]}>
            <sphereGeometry args={[headSize * 0.9, 16, 16]} />
            <meshStandardMaterial 
              color={head.hairColor}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
            />
          </mesh>
        )}

        {/* Torso */}
        <mesh>
          <boxGeometry args={[torsoWidth, torsoHeight, torsoWidth * 0.6]} />
          <meshStandardMaterial 
            color={clothing.top.color}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>

        {/* Left Arm */}
        <mesh position={[-torsoWidth * 0.6, torsoHeight * 0.1, 0]}>
          <cylinderGeometry args={[limbWidth, limbWidth, torsoHeight * 0.6, 8]} />
          <meshStandardMaterial color={body.skinTone} />
        </mesh>

        {/* Right Arm */}
        <mesh position={[torsoWidth * 0.6, torsoHeight * 0.1, 0]}>
          <cylinderGeometry args={[limbWidth, limbWidth, torsoHeight * 0.6, 8]} />
          <meshStandardMaterial color={body.skinTone} />
        </mesh>

        {/* Left Leg */}
        <mesh position={[-torsoWidth * 0.25, -torsoHeight * 0.7, 0]}>
          <cylinderGeometry args={[limbWidth, limbWidth, torsoHeight * 0.9, 8]} />
          <meshStandardMaterial color={clothing.bottom.color} />
        </mesh>

        {/* Right Leg */}
        <mesh position={[torsoWidth * 0.25, -torsoHeight * 0.7, 0]}>
          <cylinderGeometry args={[limbWidth, limbWidth, torsoHeight * 0.9, 8]} />
          <meshStandardMaterial color={clothing.bottom.color} />
        </mesh>

        {/* Accessories */}
        {accessories.slice(0, 3).map((accessory, index) => (
          <mesh key={index} position={[0, torsoHeight / 2 + headSize * 1.8, 0]}>
            <boxGeometry args={[headSize * 0.8, headSize * 0.3, headSize * 0.8]} />
            <meshStandardMaterial color={accessory.color || '#8b4513'} />
          </mesh>
        ))}
      </group>
    </RigidBody>
  );
}

// NPC Component with random walk behavior and interactions
function NPC({ config, startPosition, npcData, index, onInteraction, hoveredObject }) {
  const npcRef = useRef();
  const groupRef = useRef();
  const [direction, setDirection] = useState({ x: 0, z: 0 });
  const nextDirectionChange = useRef(Date.now() + Math.random() * 3000);
  const isHovered = hoveredObject === `npc-${index}`;

  useEffect(() => {
    if (groupRef.current && npcData.interactionType) {
      groupRef.current.userData = {
        interactionType: npcData.interactionType,
        onInteract: () => onInteraction(npcData),
        objectiveId: npcData.objectiveId,
        points: npcData.points,
        message: npcData.message,
        name: npcData.name
      };
    }
  }, []);

  useFrame(() => {
    if (!npcRef.current) return;

    const now = Date.now();
    if (now > nextDirectionChange.current) {
      // Change direction randomly
      const angle = Math.random() * Math.PI * 2;
      const speed = 1;
      setDirection({
        x: Math.cos(angle) * speed,
        z: Math.sin(angle) * speed
      });
      nextDirectionChange.current = now + 2000 + Math.random() * 2000;
    }

    // Keep NPCs within bounds
    const pos = npcRef.current.translation();
    const maxDistance = 20;
    if (Math.abs(pos.x) > maxDistance || Math.abs(pos.z) > maxDistance) {
      // Turn back towards center
      const angleToCenter = Math.atan2(-pos.z, -pos.x);
      setDirection({
        x: Math.cos(angleToCenter) * 1,
        z: Math.sin(angleToCenter) * 1
      });
    }

    npcRef.current.setLinvel({ x: direction.x, y: npcRef.current.linvel().y, z: direction.z }, true);
  });

  return (
    <RigidBody
      ref={npcRef}
      position={startPosition}
      colliders={false}
      enabledRotations={[false, true, false]}
      linearDamping={0.5}
    >
      <CapsuleCollider args={[0.3, 0.15]} />
      <group ref={groupRef}>
        <Character 
          config={config} 
          isPlayer={false} 
          emissive={isHovered ? '#ffff00' : '#000000'}
          emissiveIntensity={isHovered ? 0.2 : 0}
        />
      </group>
    </RigidBody>
  );
}

// Scene Objects Component with Interaction Support
function SceneObjects({ sceneConfig, onInteraction, playerPosition, hoveredObject, setHoveredObject }) {
  const { terrain, staticObjects = [], physicsObjects = [] } = sceneConfig;

  // Interactable Object Component
  function InteractableObject({ obj, index, isStatic }) {
    const meshRef = useRef();
    const [isCollected, setIsCollected] = useState(false);
    
    // Animated scale for collection
    const { scale } = useSpring({
      scale: isCollected ? 0 : 1,
      config: { tension: 200, friction: 20 }
    });

    // Check if this object is hovered
    const isHovered = hoveredObject === `${isStatic ? 'static' : 'physics'}-${index}`;
    
    // Glow effect for interactables
    const emissive = isHovered && obj.interactionType ? '#ffff00' : '#000000';
    const emissiveIntensity = isHovered && obj.interactionType ? 0.3 : 0;

    const handleInteract = () => {
      if (!obj.interactionType || obj.interactionType === 'none') return;
      
      onInteraction(obj);
      if (obj.interactionType === 'collect') {
        setIsCollected(true);
      }
    };

    useEffect(() => {
      if (meshRef.current && obj.interactionType && obj.interactionType !== 'none') {
        meshRef.current.userData = {
          interactionType: obj.interactionType,
          onInteract: handleInteract,
          objectiveId: obj.objectiveId,
          points: obj.points,
          message: obj.message,
          name: obj.name
        };
      }
    }, []);

    const MeshContent = () => (
      <animated.mesh
        ref={meshRef}
        scale={scale}
        castShadow
      >
        {obj.type === 'box' && <boxGeometry />}
        {obj.type === 'sphere' && <sphereGeometry />}
        {obj.type === 'cylinder' && <cylinderGeometry />}
        {obj.type === 'cone' && <coneGeometry />}
        <meshStandardMaterial 
          color={obj.color} 
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
        />
      </animated.mesh>
    );

    if (isStatic) {
      return (
        <group position={obj.position} scale={obj.scale || [1, 1, 1]}>
          <MeshContent />
        </group>
      );
    } else {
      return (
        <RigidBody position={obj.position} colliders="hull">
          <group scale={obj.scale || [1, 1, 1]}>
            <MeshContent />
          </group>
        </RigidBody>
      );
    }
  }

  return (
    <>
      {/* Ground */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[terrain?.size || 100, terrain?.size || 100]} />
          <meshStandardMaterial color={terrain?.color || '#6b8e23'} />
        </mesh>
      </RigidBody>

      {/* Static Objects */}
      {staticObjects.map((obj, index) => (
        <InteractableObject 
          key={`static-${index}`}
          obj={obj}
          index={index}
          isStatic={true}
        />
      ))}

      {/* Physics Objects */}
      {physicsObjects.map((obj, index) => (
        <InteractableObject 
          key={`physics-${index}`}
          obj={obj}
          index={index}
          isStatic={false}
        />
      ))}
    </>
  );
}

// Camera Follow Component
function CameraController({ target }) {
  const { camera } = useThree();
  const controlsRef = useRef();

  useFrame(() => {
    if (controlsRef.current && target.current) {
      const pos = target.current.translation();
      
      // Set the target (what camera looks at) to character position
      controlsRef.current.target.set(pos.x, pos.y + 1, pos.z);
      
      // Position camera behind and above the character
      const cameraOffset = { x: 0, y: 4, z: 8 }; // Behind and above
      camera.position.set(
        pos.x + cameraOffset.x,
        pos.y + cameraOffset.y,
        pos.z + cameraOffset.z
      );
      
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={5}
      maxDistance={20}
      maxPolarAngle={Math.PI / 2.2}
      minPolarAngle={Math.PI / 6}
      enablePan={false}
    />
  );
}

// Main Scene Component
function Scene({ sceneConfig, characterConfig, worldId, objectives, setObjectives, score, setScore }) {
  const playerRef = useRef();
  const spawn = sceneConfig.characterSpawn || [0, 2, 5];
  const keysPressed = useRef({ 
    ArrowUp: false, 
    ArrowDown: false, 
    ArrowLeft: false, 
    ArrowRight: false
  });
  const [hoveredObject, setHoveredObject] = useState(null);
  const { raycaster, camera, scene, mouse } = useThree();

  // Mouse move handler for hover detection
  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!playerRef.current) return;

      const canvas = event.target;
      const rect = canvas.getBoundingClientRect();
      const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera({ x: mouseX, y: mouseY }, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      const playerPos = playerRef.current.translation();
      let foundInteractable = null;

      for (const intersect of intersects) {
        let obj = intersect.object;
        // Walk up the tree to find userData
        while (obj && !obj.userData.interactionType && obj.parent) {
          obj = obj.parent;
        }

        if (obj && obj.userData.interactionType) {
          const objPos = intersect.point;
          const distance = Math.sqrt(
            Math.pow(playerPos.x - objPos.x, 2) +
            Math.pow(playerPos.z - objPos.z, 2)
          );

          if (distance <= 3) {
            foundInteractable = obj;
            break;
          }
        }
      }

      if (foundInteractable) {
        canvas.style.cursor = 'pointer';
      } else {
        canvas.style.cursor = 'default';
      }
    };

    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('mousemove', handleMouseMove);
      return () => canvas.removeEventListener('mousemove', handleMouseMove);
    }
  }, [raycaster, camera, scene]);

  // Click handler for interactions
  useEffect(() => {
    const handleClick = (event) => {
      if (!playerRef.current) return;

      const canvas = event.target;
      const rect = canvas.getBoundingClientRect();
      const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera({ x: mouseX, y: mouseY }, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      const playerPos = playerRef.current.translation();

      for (const intersect of intersects) {
        let obj = intersect.object;
        // Walk up the tree to find userData
        while (obj && !obj.userData.interactionType && obj.parent) {
          obj = obj.parent;
        }

        if (obj && obj.userData.interactionType && obj.userData.onInteract) {
          const objPos = intersect.point;
          const distance = Math.sqrt(
            Math.pow(playerPos.x - objPos.x, 2) +
            Math.pow(playerPos.z - objPos.z, 2)
          );

          if (distance <= 3) {
            obj.userData.onInteract();
            break;
          }
        }
      }
    };

    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('click', handleClick);
      return () => canvas.removeEventListener('click', handleClick);
    }
  }, [raycaster, camera, scene]);

  // Keyboard controls for player
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key in keysPressed.current) {
        keysPressed.current[e.key] = true;
      }
    };

    const handleKeyUp = (e) => {
      if (e.key in keysPressed.current) {
        keysPressed.current[e.key] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Handle interactions
  const handleInteraction = async (interactableData) => {
    console.log('Interacting with:', interactableData);
    
    // Find matching objective
    const objIndex = objectives.findIndex(obj => obj.id === interactableData.objectiveId);
    if (objIndex === -1) return;

    const objective = objectives[objIndex];
    if (objective.completed) return;

    // Update objective progress
    const updatedObjectives = [...objectives];
    updatedObjectives[objIndex] = {
      ...objective,
      currentCount: Math.min(objective.currentCount + 1, objective.targetCount)
    };

    // Check if objective completed
    if (updatedObjectives[objIndex].currentCount >= updatedObjectives[objIndex].targetCount) {
      updatedObjectives[objIndex].completed = true;
    }

    const scoreChange = interactableData.points || 0;
    const newScore = score + scoreChange;

    // Update local state immediately (optimistic update)
    setObjectives(updatedObjectives);
    setScore(newScore);

    // Persist to backend
    try {
      const response = await fetch(`/api/worlds/${worldId}/score`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scoreChange: scoreChange,
          objectives: updatedObjectives
        }),
      });

      if (!response.ok) {
        console.error('Failed to save score');
        // Optionally rollback on error
      }
    } catch (error) {
      console.error('Error saving score:', error);
    }

    // Show message
    if (interactableData.message) {
      console.log(interactableData.message);
    }
  };

  useFrame(() => {
    if (!playerRef?.current) return;

    const speed = 3;
    let vx = 0;
    let vz = 0;

    if (keysPressed.current.ArrowUp) vz -= speed;
    if (keysPressed.current.ArrowDown) vz += speed;
    if (keysPressed.current.ArrowLeft) vx -= speed;
    if (keysPressed.current.ArrowRight) vx += speed;

    playerRef.current.setLinvel({ x: vx, y: playerRef.current.linvel().y, z: vz }, true);
  });

  return (
    <>
      <Sky sunPosition={[100, 20, 100]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      
      <CameraController target={playerRef} />

      <Physics gravity={[0, -9.81, 0]}>
        <SceneObjects 
          sceneConfig={sceneConfig} 
          onInteraction={handleInteraction}
          hoveredObject={hoveredObject}
          setHoveredObject={setHoveredObject}
        />
        
        {/* Player Character */}
        <RigidBody
          ref={playerRef}
          position={spawn}
          colliders={false}
          enabledRotations={[false, true, false]}
          linearDamping={0.5}
        >
          <CapsuleCollider args={[0.3, 0.15]} />
          <CharacterMesh config={characterConfig} />
        </RigidBody>

        {/* NPCs */}
        {(sceneConfig.npcs || []).map((npc, index) => (
          <NPC
            key={`npc-${index}`}
            index={index}
            npcData={npc}
            onInteraction={handleInteraction}
            hoveredObject={hoveredObject}
            config={{
              body: { height: 1.6, build: 'average', skinTone: npc.color || '#d4a574' },
              head: { hairStyle: 'short', hairColor: '#3d2817', facialHair: 'none' },
              clothing: {
                top: { color: npc.color || '#8b4513' },
                bottom: { color: '#4a4a4a' },
                footwear: { color: '#2c2c2c' }
              },
              accessories: []
            }}
            startPosition={npc.position}
          />
        ))}
      </Physics>
    </>
  );
}

// Main Component
function WorldScene({ sceneConfig, characterConfig, onExit, worldId, initialObjectives, initialScore }) {
  const [objectives, setObjectives] = useState(initialObjectives || []);
  const [score, setScore] = useState(initialScore || 0);
  const [showObjectives, setShowObjectives] = useState(true);
  const canvasRef = useRef();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onExit();
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        setShowObjectives(!showObjectives);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit, showObjectives]);

  // Handle click for interactions with raycasting
  const handleCanvasClick = (event) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    // Note: Raycasting will be handled in Scene component via useThree
    canvas.dispatchEvent(new CustomEvent('canvasClick', { detail: mouse }));
  };

  return (
    <div className="world-scene-container">
      <Canvas 
        ref={canvasRef}
        camera={{ position: [0, 5, 10], fov: 60 }} 
        shadows
        onClick={handleCanvasClick}
      >
        <Scene 
          sceneConfig={sceneConfig} 
          characterConfig={characterConfig}
          worldId={worldId}
          objectives={objectives}
          setObjectives={setObjectives}
          score={score}
          setScore={setScore}
        />
      </Canvas>

      {/* Score HUD */}
      <div className="score-hud">
        Score: {score}
      </div>

      {/* Objectives Panel */}
      {showObjectives && (
        <div className="objectives-panel">
          <h3>Objectives</h3>
          {objectives.map((obj, index) => (
            <div key={index} className={`objective ${obj.completed ? 'completed' : ''}`}>
              <span className="objective-text">
                {obj.completed && '✓ '}
                {obj.description}
              </span>
              {obj.type === 'collect' && obj.targetCount > 1 && (
                <span className="objective-progress">
                  {obj.currentCount}/{obj.targetCount}
                </span>
              )}
              {obj.type === 'timed' && !obj.completed && (
                <span className="objective-time">
                  {obj.timeLimit}s
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <button className="exit-button" onClick={onExit}>
        ✕
      </button>

      <div className="instructions-panel">
        <p>Arrow Keys: Move</p>
        <p>Mouse: Rotate Camera</p>
        <p>Click: Interact</p>
        <p>Tab: Toggle Objectives</p>
        <p>ESC / ✕: Exit World</p>
      </div>
    </div>
  );
}

export default WorldScene;
