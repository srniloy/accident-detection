from accident_detection import Detect, encode_image
from ultralytics import YOLO
import paho.mqtt.client as mqtt
import json
import time


# MQTT settings
broker = "localhost"  # Local broker
port = 1883
topic = "rtmqtt/accident_detection"


# Function to publish detection results
def publish_detection(img_path):
    client = mqtt.Client()

    # Set User Properties (RT-MQTT)
    user_properties = {
        "Priority": "High",           # Example metadata
        "Deadline": "500",            # Max delay in milliseconds
        "Bandwidth": "50000",         # Approx bandwidth in bits/second
        "PayloadSize": str(2000)      # Max payload size
    }
    metadata = [{"key": key, "value": value} for key, value in user_properties.items()]

    client.connect(broker, port, 60)

    # Run detection
    detection_result = Detect(img_path)


    if detection_result['detections'][0]['class'] == 'Severe':
        # Include encoded image in the message
        detection_result['image_data'] = encode_image(detection_result['output_path']+ '/' + img_path.split('/')[-1])
        # Measure the size of the payload
        payload = json.dumps(detection_result)
        payload_size = len(payload.encode('utf-8'))  # Size in bytes
        print(f"Payload size: {payload_size} bytes")
        detection_result['timestamp'] = time.time()
        # Prepare and publish message
        message = json.dumps(detection_result)
        client.publish(topic, message, properties={"user_properties": metadata})
        print(f"Detection results and image sent for: {img_path}")

    client.disconnect()

if __name__ == "__main__":
    # Example usage
    image_path = "test_images/a3.jpg"  # Replace with the image path
    publish_detection(img_path= image_path)










