from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os
import json
from gpt_utils import AzureOpenAITester, AZURE_OPENAI_MODEL, extract_json_obj_from_string

app = Flask(__name__)
CORS(app)

# Configure SQLite database
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'game_worlds.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Initialize GPT tester
gpt_tester = AzureOpenAITester()

# World Model
class World(db.Model):
    __tablename__ = 'worlds'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    scene_config = db.Column(db.Text, nullable=True)  # JSON string for 3D scene
    character_config = db.Column(db.Text, nullable=True)  # JSON string for character appearance
    score = db.Column(db.Integer, default=0, nullable=False)  # Player's current score
    objectives = db.Column(db.Text, nullable=True)  # JSON string for objectives tracking
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'scene_config': self.scene_config,
            'character_config': self.character_config,
            'score': self.score,
            'objectives': self.objectives,
            'created_at': self.created_at.isoformat()
        }

# Create tables and migrate existing tables
with app.app_context():
    db.create_all()
    
    # Migration: Add scene_config and character_config columns if they don't exist
    try:
        with db.engine.connect() as conn:
            # Check if columns exist by trying to select them
            result = conn.execute(db.text("PRAGMA table_info(worlds)"))
            columns = [row[1] for row in result]
            
            if 'scene_config' not in columns:
                print("Adding scene_config column to worlds table...")
                conn.execute(db.text("ALTER TABLE worlds ADD COLUMN scene_config TEXT"))
                conn.commit()
                print("✅ Added scene_config column")
            
            if 'character_config' not in columns:
                print("Adding character_config column to worlds table...")
                conn.execute(db.text("ALTER TABLE worlds ADD COLUMN character_config TEXT"))
                conn.commit()
                print("✅ Added character_config column")
            
            if 'score' not in columns:
                print("Adding score column to worlds table...")
                conn.execute(db.text("ALTER TABLE worlds ADD COLUMN score INTEGER DEFAULT 0"))
                conn.commit()
                print("✅ Added score column")
            
            if 'objectives' not in columns:
                print("Adding objectives column to worlds table...")
                conn.execute(db.text("ALTER TABLE worlds ADD COLUMN objectives TEXT"))
                conn.commit()
                print("✅ Added objectives column")
    except Exception as e:
        print(f"Migration error (may be normal if columns already exist): {e}")

# API Routes
@app.route('/api/worlds', methods=['POST'])
def create_world():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        name = data.get('name', '').strip()
        description = data.get('description', '').strip()
        
        # Validation
        if not name:
            return jsonify({'error': 'World name is required'}), 400
        
        if not description:
            return jsonify({'error': 'World description is required'}), 400
        
        # Create new world
        new_world = World(name=name, description=description)
        db.session.add(new_world)
        db.session.commit()
        
        return jsonify({
            'message': 'World created successfully',
            'world': new_world.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/worlds', methods=['GET'])
def get_worlds():
    try:
        worlds = World.query.order_by(World.created_at.desc()).all()
        return jsonify({
            'worlds': [world.to_dict() for world in worlds]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/worlds/<int:world_id>', methods=['GET'])
def get_world(world_id):
    try:
        world = World.query.get(world_id)
        if not world:
            return jsonify({'error': 'World not found'}), 404
        return jsonify({'world': world.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/worlds/<int:world_id>', methods=['DELETE'])
def delete_world(world_id):
    try:
        world = World.query.get(world_id)
        if not world:
            return jsonify({'error': 'World not found'}), 404
        
        db.session.delete(world)
        db.session.commit()
        
        return jsonify({'message': 'World deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/worlds/<int:world_id>', methods=['PATCH'])
def update_world(world_id):
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        world = World.query.get(world_id)
        if not world:
            return jsonify({'error': 'World not found'}), 404
        
        # Update name and description if provided
        if 'name' in data:
            world.name = data['name'].strip()
        if 'description' in data:
            world.description = data['description'].strip()
        
        db.session.commit()
        
        return jsonify({
            'message': 'World updated successfully',
            'world': world.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/worlds/<int:world_id>/score', methods=['PATCH'])
def update_score(world_id):
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        world = World.query.get(world_id)
        if not world:
            return jsonify({'error': 'World not found'}), 404
        
        # Update score if provided
        if 'scoreChange' in data:
            world.score = (world.score or 0) + data['scoreChange']
        
        # Update objectives if provided
        if 'objectives' in data:
            world.objectives = json.dumps(data['objectives'])
        
        db.session.commit()
        
        return jsonify({
            'message': 'Score updated successfully',
            'world': world.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/worlds/generate-scene', methods=['POST'])
def generate_scene():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        world_id = data.get('worldId')
        
        if not world_id:
            return jsonify({'error': 'World ID is required'}), 400
        
        # Get world from database
        world = World.query.get(world_id)
        if not world:
            return jsonify({'error': 'World not found'}), 404
        
        # Check if scene already generated
        if world.scene_config and world.character_config:
            return jsonify({
                'message': 'Scene already exists',
                'scene_config': json.loads(world.scene_config),
                'character_config': json.loads(world.character_config)
            }), 200
        
        # Construct GPT prompts
        system_prompt = """You are a 3D world generator for a game. Generate a JSON configuration for a Three.js scene.

IMPORTANT: Return ONLY valid JSON. No markdown, no code blocks, no explanation.

JSON Schema:
{
  "terrain": {"type": "plane", "size": 100, "color": "#hex"},
  "staticObjects": [{"type": "box|sphere|cylinder|cone", "position": [x,y,z], "scale": [x,y,z], "color": "#hex", "name": "description", "interactionType": "collect|activate|none", "objectiveId": "string", "points": 0-50, "message": "text"}],
  "physicsObjects": [{"type": "box|sphere|cylinder", "position": [x,y,z], "scale": [x,y,z], "color": "#hex", "name": "description", "interactionType": "collect|activate|none", "objectiveId": "string", "points": 0-50, "message": "text"}],
  "lights": [{"type": "ambient|directional|point", "intensity": 0-1, "position": [x,y,z], "color": "#hex"}],
  "npcs": [{"position": [x,y,z], "color": "#hex", "name": "description", "interactionType": "talk", "objectiveId": "string", "points": 0-30, "message": "dialogue text"}],
  "objectives": [{"id": "string", "type": "collect|talk|reach|activate|timed", "description": "task description", "targetCount": 1-10, "currentCount": 0, "timeLimit": 0-300, "rewardPoints": 10-100, "completed": false}],
  "characterSpawn": [x,y,z],
  "characterAppearance": {
    "body": {"height": 1.6-2.0, "build": "slim|average|muscular", "skinTone": "#hex"},
    "head": {"hairStyle": "short|long|bald|curly", "hairColor": "#hex", "facialHair": "none|beard|mustache"},
    "clothing": {"top": {"type": "tunic|shirt|robe", "color": "#hex"}, "bottom": {"type": "pants|robe|skirt", "color": "#hex"}, "footwear": {"type": "sandals|boots|shoes", "color": "#hex"}},
    "accessories": [{"type": "hat|tool|weapon|glasses", "name": "description", "color": "#hex"}]
  }
}

Rules:
- Max 30 staticObjects (visual only, no collision)
- Max 15 physicsObjects (with collision detection)
- Max 8 NPCs
- Max 3 accessories for character
- Create 3-5 objectives that match the world theme
- Interaction range is 3 units for all interactables
- Use unique objectiveId strings (e.g., "collect_apples", "talk_to_guard")
- For collect objectives: set targetCount > 1 for gathering tasks
- For timed objectives: set timeLimit in seconds (30-180s recommended)
- Points should reward harder objectives more (10-100 range)
- All interactable objects/NPCs must have interactionType, objectiveId, points, and message
- Make messages thematic and engaging
- All colors as hex strings
- Positions as [x, y, z] arrays
- Make scene match the world description
- Character appearance should match description if provided
- Include at least 2 lights (ambient + directional)
- NPCs should fit the world theme"""
        
        user_prompt = f"""Create a 3D game world configuration:

World Name: {world.name}
Description: {world.description}

Generate a detailed JSON scene following the schema. Make it immersive and match the description closely."""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        print(f"\n🎮 Generating scene for world: {world.name}")
        
        # Call GPT to generate scene
        gpt_response = gpt_tester.get_gpt_response(AZURE_OPENAI_MODEL, messages)
        
        # Extract JSON from response
        json_str = extract_json_obj_from_string(gpt_response)
        
        if not json_str:
            return jsonify({'error': 'Failed to generate valid scene configuration'}), 500
        
        # Parse and validate JSON
        try:
            scene_data = json.loads(json_str)
        except json.JSONDecodeError as e:
            print(f"❌ JSON parse error: {e}")
            return jsonify({'error': 'Invalid JSON generated'}), 500
        
        # Validate required fields
        required_fields = ['terrain', 'characterSpawn', 'characterAppearance']
        for field in required_fields:
            if field not in scene_data:
                return jsonify({'error': f'Missing required field: {field}'}), 500
        
        # Extract character config
        character_config = scene_data.pop('characterAppearance')
        
        # Extract objectives
        objectives = scene_data.pop('objectives', [])
        
        # Limit object counts for performance
        if 'staticObjects' in scene_data:
            scene_data['staticObjects'] = scene_data['staticObjects'][:30]
        
        if 'physicsObjects' in scene_data:
            scene_data['physicsObjects'] = scene_data['physicsObjects'][:15]
        
        if 'npcs' in scene_data:
            scene_data['npcs'] = scene_data['npcs'][:8]
        
        if 'accessories' in character_config:
            character_config['accessories'] = character_config['accessories'][:3]
        
        # Store in database
        world.scene_config = json.dumps(scene_data)
        world.character_config = json.dumps(character_config)
        world.objectives = json.dumps(objectives)
        world.score = 0  # Initialize score
        db.session.commit()
        
        print(f"✅ Scene generated and saved for world: {world.name}")
        
        return jsonify({
            'message': 'Scene generated successfully',
            'scene_config': scene_data,
            'character_config': character_config
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error generating scene: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
