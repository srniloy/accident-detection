import mqtt from 'mqtt';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

const brokerUrl = 'mqtt://localhost';
const topic = 'rtmqtt/accident_detection';

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir); // Create uploads directory if it doesn't exist
}

// Create WebSocket server
const wss = new WebSocketServer({ noServer: true });

// Handle WebSocket connections
wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
});

// Upgrade HTTP to WebSocket
const server = app.listen(port, () => {
    console.log(`Express server running at http://localhost:${port}`);
});
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

// MQTT client
const client = mqtt.connect(brokerUrl);

client.on('connect', () => {
    console.log('Connected to RT-MQTT broker');
    client.subscribe(topic, (err) => {
        if (err) {
            console.error(`Failed to subscribe to topic: ${topic}`, err);
        } else {
            console.log(`Subscribed to topic: ${topic}`);
        }
    });
});

client.on('message', (topic, message) => {
    const detectionResult = JSON.parse(message.toString());
    const receivedTime = Date.now(); 
    const sentTime = detectionResult.timestamp * 1000;
    const latency = receivedTime - sentTime;
    console.log(`Latency: ${latency} ms`);

    const payloadSize = Buffer.byteLength(message); // Size in bytes
    console.log(`Received payload size: ${payloadSize} bytes`);


    // Save the image
    const imageBuffer = Buffer.from(detectionResult.image_data, 'base64');
    const imageFileName = `detection_${Date.now()}.jpg`;
    const imagePath = path.join(uploadDir, imageFileName);

    fs.writeFileSync(imagePath, imageBuffer);
    console.log(`Image saved to: ${imagePath}`);

    // Notify WebSocket clients with image path
    const imageUrl = `/uploads/${imageFileName}`;
    wss.clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket is open
            client.send(JSON.stringify({ imageUrl, location: detectionResult.location, type: detectionResult.detections[0].class, prob: (detectionResult.detections[0].confidence*100).toFixed(2)}));
        }
    });
});

// Serve static files (uploads directory)
app.use('/uploads', express.static(uploadDir));

// Serve a simple frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
