from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

# Configure SQLite database
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'game_worlds.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# World Model
class World(db.Model):
    __tablename__ = 'worlds'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'created_at': self.created_at.isoformat()
        }

# Create tables
with app.app_context():
    db.create_all()

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

if __name__ == '__main__':
    app.run(debug=True, port=5000)
