import cv2
import dlib
from PIL import Image

# Load the pre-trained DNN model for face detection
net = cv2.dnn.readNetFromCaffe(
    "detection/deploy.prototxt", 
    "detection/res10_300x300_ssd_iter_140000.caffemodel"
)

# Load dlib's facial landmark predictor
predictor = dlib.shape_predictor("detection/shape_predictor_68_face_landmarks.dat")

def draw_eyes_on_image(image_path):
    # Load the image from the given path
    frame = cv2.imread(image_path)
    h, w = frame.shape[:2]

    # Prepare the image for the DNN model
    blob = cv2.dnn.blobFromImage(frame, 1.0, (300, 300), (104.0, 177.0, 123.0))
    net.setInput(blob)
    detections = net.forward()

    # Loop through detections
    for i in range(detections.shape[2]):
        confidence = detections[0, 0, i, 2]
        if confidence > 0.5:  # Adjust confidence threshold as needed
            box = detections[0, 0, i, 3:7] * [w, h, w, h]
            (x, y, x2, y2) = box.astype("int")
            cv2.rectangle(frame, (x, y), (x2, y2), (255, 0, 0), 2)

            # Convert face region to grayscale for dlib
            face_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            dlib_rect = dlib.rectangle(x, y, x2, y2)

            # Predict facial landmarks
            landmarks = predictor(face_gray, dlib_rect)

            # Draw circles around the eyes (landmark points 36-41 for left eye, 42-47 for right eye)
            for n in range(36, 48):  # Points for both eyes
                x_eye = landmarks.part(n).x
                y_eye = landmarks.part(n).y
                cv2.circle(frame, (x_eye, y_eye), 2, (0, 255, 0), -1)


            left_eye_center = ((landmarks.part(36).x + landmarks.part(39).x) // 2, (landmarks.part(36).y + landmarks.part(39).y) // 2)

            right_eye_center = ((landmarks.part(42).x + landmarks.part(45).x) // 2, (landmarks.part(42).y + landmarks.part(45).y) // 2)

            #left_eye = ((landmarks.part(36).x, landmarks.part(36).y), (landmarks.part(39).x, landmarks.part(39).y))
            #right_eye = ((landmarks.part(42).x, landmarks.part(42).y), (landmarks.part(45).x, landmarks.part(45).y))

    # Convert the frame to RGB for displaying
    #frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
   # pil_image = Image.fromarray(frame_rgb)

    # Display the image with eyes drawn on it
    #pil_image.show()
    #print("Success")

    return {"width": w, "height": h, "left_eye": left_eye_center, "right_eye": right_eye_center}

# Example usage:
#draw_eyes_on_image('uploaded_images/20220727_220157.jpg')