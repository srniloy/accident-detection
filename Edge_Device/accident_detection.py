from ultralytics import YOLO
import base64

def Detect(img_path):
    classes = {
        0: 'Accident',
        1: 'Moderate',
        2: 'Severe'
    }
    location = 'Uttar Badda, Dhaka'

    model = YOLO('model/accident_detection.pt')

    results = model(img_path, save=True)
    detections = []
    for result in results:  # Iterate through the results (one per image)
        for box in result.boxes:  # Iterate through detected boxes
            cls = box.cls.item()  # Class index of the prediction
            conf = box.conf.item()  # Confidence score of the prediction
            detections.append({
                'class': classes[cls],
                'confidence': conf
            })

    return {
        'detections': detections,
        'img_path': img_path,
        'location': location,
        'output_path': results[0].save_dir
    }


def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        encoded_image = base64.b64encode(image_file.read()).decode('utf-8')
    return encoded_image
