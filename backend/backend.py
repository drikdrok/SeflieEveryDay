from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import os
from PIL import Image
import io

from threading import Thread

from flask_cors import CORS

import eye_coords

app = Flask(__name__)
CORS(app)

# Set the folder where the images will be saved
UPLOAD_FOLDER = 'uploaded_images'
app.config['MAX_CONTENT_LENGTH'] = 1024 * 1024 * 1024 * 32  # 1 GB
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

# Function to check if the file is allowed
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


progress_dict = {}
finished_dict = {}

def analyze_images(job_id, files):
    if not files:
        finished_dict[job_id] = jsonify({"error": "No files selected"})
        return

    print("Analysing ", len(files), " images")
    
    eye_positions = []
    completed = 0
    for file in files:
        print("analysing ", file)
        coords = eye_coords.draw_eyes_on_image(file)
        eye_positions.append(coords)
        completed += 1
        progress_dict[job_id] = completed / len(files) * 100

    print("Finished processing images")
    finished_dict[job_id] = {"files": files, "eye_position": eye_positions}
    return

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
    
    job_id = "some_unique_id"  # you can generate a random UUID
    progress_dict[job_id] = 0

    if not os.path.exists(UPLOAD_FOLDER + "/" + job_id):
        os.makedirs(UPLOAD_FOLDER + "/" + job_id)
    
    for file in files:
        # Check if the file has an allowed extension
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'] + "/" + job_id, filename)

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

     # 2. "Start" the task in a separate thread

    # Start a separate thread to handle the long processing
    thread = Thread(target=analyze_images, args=(job_id, uploaded_files))
    thread.start()

    # 3. Return the job_id immediately
    return jsonify({"job_id": job_id}), 200

@app.route('/progress/<job_id>', methods=['GET'])
def get_progress(job_id):
    if job_id not in progress_dict:
        return jsonify({"error": "Invalid job_id"}), 404

    return jsonify({
        "progress": progress_dict[job_id]
    }), 200    


@app.route("/get_info/<job_id>", methods=['GET'])
def get_info(job_id):
    if job_id not in finished_dict:
        return jsonify({"error": "Invalid job_id"}), 404

    data = finished_dict.pop(job_id)
    output = {
        "message": "Images uploaded successfully",
        "data": data
    }

    progress_dict.pop(job_id)

    #Cleanup
    for file in data["files"]:
        os.remove(file)

    if os.path.exists(UPLOAD_FOLDER + "/" + job_id):
        os.rmdir(UPLOAD_FOLDER + "/" + job_id)
        
    

    return output



#Start

print("Starting Server")

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.run(debug=True)