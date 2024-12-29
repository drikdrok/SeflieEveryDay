from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import os
from PIL import Image
import io

from flask_cors import CORS

import eye_coords

app = Flask(__name__)
CORS(app)

# Set the folder where the images will be saved
UPLOAD_FOLDER = 'uploaded_images'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# Function to check if the file is allowed
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Route to handle multiple image uploads
@app.route('/upload_images', methods=['POST'])
def upload_images():
    # Check if the request contains files
    if 'images' not in request.files:
        return jsonify({"error": "No files part"}), 400

    files = request.files.getlist('images')
    
    if not files:
        return jsonify({"error": "No files selected"}), 400

    uploaded_files = []
    
    for file in files:
        # Check if the file has an allowed extension
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)

            # Save the image
            file.save(filepath)

            # Optionally, you can open the image using PIL to process or validate it
            try:
                img = Image.open(filepath)
                img.verify()  # Verify that it is a valid image
            except Exception as e:
                return jsonify({"error": f"Invalid image file: {str(e)}"}), 400

            uploaded_files.append(filepath)
        else:
            return jsonify({"error": f"Invalid file type: {file.filename}"}), 400
    
    eye_positions = []
    for file in uploaded_files:
        coords = eye_coords.draw_eyes_on_image(file)
        eye_positions.append(coords)

    return jsonify({"message": "Images uploaded successfully", "files": uploaded_files, "eye_position": eye_positions}), 200


#Start

print("Starting Server")

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.run(debug=True)