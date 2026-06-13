from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
try:
    from PIL import Image
except ImportError:
    Image = None
    print("⚠️ Pillow (PIL) not installed — image preprocessing will be disabled until you install the 'pillow' package.")
import io
import json
import os

# CORRECTED IMPORTS - Use tensorflow directly, not tensorflow.keras.models
try:
    import tensorflow as tf
    from tensorflow import keras
    print(f"✅ TensorFlow version: {tf.__version__}")
except ImportError as e:
    print(f"❌ TensorFlow import error: {e}")
    print("Please run: pip install tensorflow")
    tf = None
    keras = None

app = Flask(__name__)
CORS(app)

# Global variables
model = None
class_names = None

def load_model_with_fallback():
    """Load the trained model with clear error messages"""
    global model, class_names
    
    print("="*50)
    print("🔍 LOADING PLANT DISEASE MODEL")
    print("="*50)
    
    if tf is None or keras is None:
        print("❌ TensorFlow not available!")
        return False
    
    # Look for model file
    model_paths = [
        'plant_disease_model.keras',
        'plant_disease_model.h5',
        'plant_disease_model_mobilenet.keras',
        'plant_disease_model_mobilenet.h5'
    ]
    
    model_found = None
    for path in model_paths:
        if os.path.exists(path):
            model_found = path
            break
    
    if model_found:
        try:
            print(f"📁 Found model: {model_found}")
            model = keras.models.load_model(model_found)
            print("✅ Model loaded successfully!")
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            model = None
    else:
        print("❌ No model file found!")
        print("   Looking for:", model_paths)
        print("   Current directory contents:")
        for file in os.listdir('.'):
            if file.endswith(('.keras', '.h5', '.json')):
                print(f"      - {file}")
        model = None
    
    # Load class names
    class_names_paths = ['class_names.json', 'class_names (2).json']
    for path in class_names_paths:
        if os.path.exists(path):
            try:
                with open(path, 'r') as f:
                    class_names = json.load(f)
                print(f"✅ Loaded {len(class_names)} disease classes from {path}")
                break
            except:
                continue
    else:
        print("❌ class_names.json not found!")
        class_names = None
    
    print("="*50)
    return model is not None

def preprocess_image(image_file):
    """Preprocess image for model prediction"""
    img = Image.open(io.BytesIO(image_file.read()))
    
    # Convert to RGB if needed
    if img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Resize to 224x224 (MobileNetV2 input size)
    img = img.resize((224, 224))
    
    # Convert to array and normalize
    img_array = np.array(img) / 255.0
    
    # Add batch dimension
    img_batch = np.expand_dims(img_array, axis=0)
    
    return img_batch

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'num_classes': len(class_names) if class_names else 0,
        'tensorflow_available': tf is not None
    })

@app.route('/predict', methods=['POST'])
def predict():
    try:
        if 'image' not in request.files:
            return jsonify({'success': False, 'error': 'No image file'}), 400
        
        file = request.files['image']
        
        if model is None or class_names is None:
            return jsonify({
                'success': False,
                'error': 'Model not loaded. Please check server logs.',
                'prediction': 'Model unavailable'
            }), 500
        
        # Preprocess image
        img_array = preprocess_image(file)
        
        # Make prediction
        predictions = model.predict(img_array, verbose=0)
        predicted_idx = np.argmax(predictions[0])
        confidence = float(predictions[0][predicted_idx])
        predicted_class = class_names[predicted_idx]
        
        # Get top 3 predictions
        top_3_idx = np.argsort(predictions[0])[-3:][::-1]
        top_3 = [
            {'disease': class_names[idx], 'confidence': float(predictions[0][idx])}
            for idx in top_3_idx
        ]
        
        print(f"📊 Prediction: {predicted_class} ({confidence:.2%})")
        
        return jsonify({
            'success': True,
            'prediction': predicted_class,
            'confidence': confidence,
            'top_3': top_3
        })
        
    except Exception as e:
        print(f"❌ Prediction error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/info', methods=['GET'])
def info():
    return jsonify({
        'model_loaded': model is not None,
        'model_file_exists': any([
            os.path.exists('plant_disease_model.keras'),
            os.path.exists('plant_disease_model.h5')
        ]),
        'classes': class_names if class_names else [],
        'tensorflow_available': tf is not None,
        'current_directory_files': [f for f in os.listdir('.') if f.endswith(('.keras', '.h5', '.json'))]
    })

if __name__ == '__main__':
    # Load model before starting server
    model_loaded = load_model_with_fallback()
    
    if not model_loaded:
        print("\n⚠️ WARNING: Model not loaded!")
        print("   Please ensure model files are in the correct location")
    
    print("\n🚀 Starting Flask server...")
    print("📍 http://localhost:5000")
    print("📍 http://localhost:5000/health")
    print("📍 http://localhost:5000/info")
    app.run(host='0.0.0.0', port=5000, debug=True)