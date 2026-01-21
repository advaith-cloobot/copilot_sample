# Phase 3 Development: Interactive Gameplay & Objectives System

## Overview
Phase 3 adds gamification features including jump mechanics, proximity-based interactions, score tracking, and objective-driven gameplay to create an engaging 3D game experience.

## Features Implemented

### 1. Database Enhancements
**File**: `backend/server.py`

#### New Columns
- `score` (INTEGER, default 0): Tracks player's current score
- `objectives` (TEXT): JSON array storing objective configurations and progress

#### Migration Support
Automatic column addition using `ALTER TABLE` with PRAGMA checks to safely update existing databases.

### 2. Backend API Updates

#### PATCH `/api/worlds/<id>/score`
Real-time score and objective persistence endpoint.

**Request Body**:
```json
{
  "scoreChange": 10,
  "objectives": [
    {
      "id": "collect_apples",
      "type": "collect",
      "description": "Collect 5 apples",
      "targetCount": 5,
      "currentCount": 3,
      "rewardPoints": 50,
      "completed": false
    }
  ]
}
```

**Response**:
```json
{
  "message": "Score updated successfully",
  "world": {
    "id": 1,
    "score": 30,
    "objectives": "[...]",
    ...
  }
}
```

### 3. Enhanced GPT Scene Generation

#### Updated Schema
Objects and NPCs now include interaction metadata:

```json
{
  "staticObjects": [
    {
      "type": "sphere",
      "position": [5, 0.5, -3],
      "scale": [0.5, 0.5, 0.5],
      "color": "#ff0000",
      "name": "Apple",
      "interactionType": "collect",
      "objectiveId": "collect_apples",
      "points": 10,
      "message": "You collected a delicious apple!"
    }
  ],
  "npcs": [
    {
      "position": [10, 2, 5],
      "color": "#8b4513",
      "name": "Village Elder",
      "interactionType": "talk",
      "objectiveId": "talk_to_elder",
      "points": 20,
      "message": "Welcome, brave adventurer!"
    }
  ],
  "objectives": [
    {
      "id": "collect_apples",
      "type": "collect",
      "description": "Collect 5 apples",
      "targetCount": 5,
      "currentCount": 0,
      "timeLimit": 0,
      "rewardPoints": 50,
      "completed": false
    }
  ]
}
```

#### Interaction Types
- **collect**: Remove object from world, increment progress
- **talk**: Display dialogue, mark as talked-to
- **activate**: Trigger special object (lever, door, etc.)
- **reach**: Location-based objectives
- **timed**: Countdown objectives

### 4. Jump Mechanics
**File**: `frontend/src/components/WorldScene.js`

#### Implementation
- **Trigger**: Spacebar key
- **Ground Detection**: Downward raycast (0.6 unit range)
- **Jump Force**: Vertical impulse of 6 units
- **Cooldown**: 300ms to prevent spam
- **Physics**: Integrates with Rapier physics system

```javascript
if (keysPressed.current[' '] && canJump && currentTime - lastJumpTime.current > 300) {
  const raycasterDown = new THREE.Raycaster(
    new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z),
    new THREE.Vector3(0, -1, 0),
    0,
    0.6
  );
  
  const intersects = raycasterDown.intersectObjects(scene.children, true);
  if (intersects.length > 0) {
    playerRef.current.applyImpulse({ x: 0, y: 6, z: 0 }, true);
    lastJumpTime.current = currentTime;
    setCanJump(false);
    setTimeout(() => setCanJump(true), 300);
  }
}
```

### 5. Proximity-Based Interactions

#### Raycasting System
- **Range**: 3 units from player
- **Detection**: Mouse move for hover, click for interaction
- **Distance Calculation**: 2D distance (XZ plane) to avoid height restrictions

#### Hover Effects
- Yellow emissive glow on interactable objects/NPCs
- Cursor changes to pointer when hovering over interactable
- Visual feedback for proximity-based interactions

#### Click Handler
```javascript
const handleClick = (event) => {
  const intersects = raycaster.intersectObjects(scene.children, true);
  
  for (const intersect of intersects) {
    let obj = intersect.object;
    // Walk up tree to find userData
    while (obj && !obj.userData.interactionType && obj.parent) {
      obj = obj.parent;
    }

    if (obj && obj.userData.interactionType && obj.userData.onInteract) {
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
```

### 6. Interaction Animations
**Package**: `@react-spring/three`

#### Collection Animation
```javascript
const { scale } = useSpring({
  scale: isCollected ? 0 : 1,
  config: { tension: 200, friction: 20 }
});

<animated.mesh scale={scale}>
  {/* Object geometry */}
</animated.mesh>
```

Objects fade out and shrink when collected, providing satisfying visual feedback.

### 7. Score & Objectives HUD

#### Score Display
- **Location**: Top-right corner
- **Style**: Vintage parchment with golden border
- **Updates**: Immediate on interaction (optimistic UI)

#### Objectives Panel
- **Location**: Below score, right side
- **Toggle**: Tab key
- **Features**:
  - Multi-step progress display ("3/5")
  - Checkmarks for completed objectives
  - Time remaining for timed objectives
  - Hover effects on objectives
  - Completed objectives shown with green tint

```css
.score-hud {
  position: absolute;
  top: 20px;
  right: 90px;
  background: linear-gradient(to bottom, #f4e4c1, #d4c4a0);
  padding: 12px 24px;
  border-radius: 8px;
  border: 3px solid #8b7355;
  font-size: 1.2rem;
  font-weight: bold;
}

.objectives-panel {
  position: absolute;
  top: 80px;
  right: 20px;
  background: rgba(244, 228, 193, 0.95);
  max-width: 300px;
}
```

### 8. Immediate Score Persistence

#### Optimistic Updates
1. Update local state immediately
2. Make API call to persist
3. On error: log and optionally rollback

```javascript
const handleInteraction = async (interactableData) => {
  const updatedObjectives = [...objectives];
  updatedObjectives[objIndex].currentCount++;
  
  const newScore = score + interactableData.points;
  
  // Optimistic update
  setObjectives(updatedObjectives);
  setScore(newScore);
  
  // Persist
  try {
    await fetch(`/api/worlds/${worldId}/score`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scoreChange: interactableData.points,
        objectives: updatedObjectives
      })
    });
  } catch (error) {
    console.error('Error saving score:', error);
  }
};
```

## User Journey

### Creating a World
1. User enters world name and description
2. GPT generates scene with objectives embedded in objects/NPCs
3. Objectives loaded from database on world entry

### Playing the Game
1. **Movement**: Arrow keys to walk, spacebar to jump
2. **Exploration**: Navigate 3D world with third-person camera
3. **Interaction**: 
   - Hover over objects/NPCs within 3 units (glow effect + pointer cursor)
   - Click to interact (collect, talk, activate)
   - Instant visual feedback (animations)
   - Score updates immediately
4. **Progress Tracking**: 
   - Check objectives panel (Tab to toggle)
   - See current progress on multi-step objectives
   - Monitor time on timed objectives
5. **Completion**: Complete all objectives to maximize score

### Example Gameplay Flow
```
1. User creates "Enchanted Forest" world
2. GPT generates:
   - 5 magical mushrooms to collect (10 points each)
   - 2 forest spirits to talk to (20 points each)
   - 1 ancient tree to activate (50 points)
3. User spawns in forest
4. Sees objectives: "Collect 5 mushrooms (0/5)", "Talk to spirits (0/2)", "Activate ancient tree"
5. User walks to mushroom, sees yellow glow when in range
6. Clicks mushroom → collection animation plays
7. Score increases: 0 → 10
8. Objective updates: "Collect 5 mushrooms (1/5)"
9. Backend saves progress immediately
10. User continues until all objectives complete
```

## Technical Specifications

### Controls
- **Arrow Keys**: Movement (3 units/sec)
- **Spacebar**: Jump (6 unit impulse, 300ms cooldown)
- **Mouse**: Camera rotation
- **Left Click**: Interact with objects/NPCs (3 unit range)
- **Tab**: Toggle objectives panel
- **ESC / X Button**: Exit world

### Physics Settings
- **Gravity**: -9.81 m/s²
- **Player Collider**: CapsuleCollider (0.3 height, 0.15 radius)
- **Linear Damping**: 0.5 (smooth stopping)
- **Jump Impulse**: 6 units vertical

### Performance Limits
- Max 30 static objects
- Max 15 physics objects
- Max 8 NPCs
- Max 5 objectives per world
- Interaction range: 3 units

### Data Flow
```
User Interaction
  ↓
Raycasting (proximity check)
  ↓
Local State Update (optimistic)
  ↓
Animation Trigger
  ↓
API Call (PATCH /api/worlds/<id>/score)
  ↓
Database Update
  ↓
Confirmation (or rollback on error)
```

## Future Enhancements (Not Implemented)

### Timed Objectives
- Countdown timers in objectives panel
- Auto-fail on time expiry
- Bonus points for early completion
- Visual countdown warnings (color changes)

### Advanced Animations
- Particle effects on collection
- Dialogue bubbles for NPCs
- Activation VFX (glows, rotations)
- Player celebration animations

### Interaction Messages
- Toast notifications for interactions
- Floating damage/score numbers
- Quest completion fanfare
- Sound effects

### Multiplayer Features
- Leaderboards
- Shared objectives
- Cooperative gameplay

## Known Issues & Limitations

1. **Raycast Performance**: Multiple raycasts per frame can impact performance on complex scenes
2. **Ground Detection**: Simple downward raycast may not work on all terrain types
3. **No Undo**: Once interaction happens, cannot be reversed
4. **Limited Animation Types**: Only scale animation for collect, no particle effects
5. **Timed Objectives**: Backend support exists but frontend timer not implemented

## Testing Checklist

- [x] Database migration adds score/objectives columns
- [x] PATCH endpoint updates score correctly
- [x] GPT generates objectives with proper schema
- [x] Jump only works when grounded
- [x] Interactions only trigger within 3 units
- [x] Hover effects show on interactables
- [x] Collection animation plays smoothly
- [x] Score updates immediately in UI
- [x] Objectives progress displays correctly
- [x] Backend saves after each interaction
- [x] Tab key toggles objectives panel
- [ ] Timed objectives countdown (not implemented)
- [ ] Error rollback on failed API calls (partial)

## Conclusion
Phase 3 successfully transforms the basic 3D world explorer into an interactive game with objectives, scoring, and engaging mechanics. The foundation is solid for future enhancements like timed objectives, advanced animations, and multiplayer features.
