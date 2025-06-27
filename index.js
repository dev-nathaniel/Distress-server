import express from "express";
import { param, query, body, validationResult, matchedData, checkSchema } from "express-validator";
import { createUserValidationSchema } from "./src/utils/validationSchema.js";
import routes from './src/routes/index.js'
// Your AccountSID and Auth Token from console.twilio.com
import Twilio from 'twilio';
import mqtt from "mqtt";
import dotenv from 'dotenv';
import { createServer } from 'http'
import { Server } from "socket.io";
import Distress from "./src/models/Distress.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import fs from 'fs'
import lamejs from 'lamejs';
import nodemailer from 'nodemailer'
dotenv.config();

// Initialize Twilio client for SMS functionality
export const client = new Twilio(process.env.accountSid, process.env.authToken);

// [TRIAL AND ERROR] - Johnny Five IoT library integration
// import jf from "johnny-five";

import cors from 'cors'
import { verifyTokenAndRole } from "./src/routes/users.js";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "./firebase.js";

// Initialize Express app and HTTP server
const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {})

// Generate WAV header for audio recording
function generateWavHeader(bufferLength, options = {}) {
    const {
        numChannels = 1,
        sampleRate = 44100,
        bitsPerSample = 16,
    } = options;

    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const dataSize = bufferLength;
    const chunkSize = 36 + dataSize;

    const buffer = Buffer.alloc(44);

    // RIFF identifier
    buffer.write('RIFF', 0);
    // file length minus first 8 bytes
    buffer.writeUInt32LE(chunkSize, 4);
    // RIFF type
    buffer.write('WAVE', 8);
    // format chunk identifier
    buffer.write('fmt ', 12);
    // format chunk length
    buffer.writeUInt32LE(16, 16);
    // audio format (1 is PCM)
    buffer.writeUInt16LE(1, 20);
    // number of channels
    buffer.writeUInt16LE(numChannels, 22);
    // sample rate
    buffer.writeUInt32LE(sampleRate, 24);
    // byte rate (sampleRate * numChannels * bitsPerSample / 8)
    buffer.writeUInt32LE(byteRate, 28);
    // block align (numChannels * bitsPerSample / 8)
    buffer.writeUInt16LE(blockAlign, 32);
    // bits per sample
    buffer.writeUInt16LE(bitsPerSample, 34);
    // data chunk identifier
    buffer.write('data', 36);
    // data chunk length
    buffer.writeUInt32LE(dataSize, 40);

    return buffer;
}

// Store audio chunks for processing
let audioChunks = []

// Socket.IO middleware for authentication
io.use((socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) return next(new Error("No Token provided"));

    jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
        // [TRIAL AND ERROR] - Debug logging
        // console.log(error)
        if (error) return next( new Error( "Failed to authenticate token" ));
        const user = {id: decoded.id,
        // [TRIAL AND ERROR] - Debug logging
        // console.log(decoded.id, 'decoded')
        // console.log(request.userId, 'request')
        userRole: decoded.role
        }
        socket.user = user
        next();
    });
})

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(socket.id, 'socket id')
    socket.on('audio', (chunk) => {
        // [TRIAL AND ERROR] - Debug logging
        // console.log(chunk)
        if (audioChunks.length < 10) {
            audioChunks.push(Buffer.from(chunk, 'base64'))
        } else {
            audioChunks.map((audioChunk, index) => {
                const header = generateWavHeader(audioChunk.length)
                const wavBuffer = Buffer.concat([header, audioChunk]);
                // [TRIAL AND ERROR] - File writing
                // fs.writeFileSync('output.wav', wavBuffer);
                fs.writeFileSync(`audio-${index}.wav`, wavBuffer)
            })
        }
        // [TRIAL AND ERROR] - Debug logging
        // console.log(audioChunks)
        socket.broadcast.emit('audio', chunk)
    })

    socket.on('test', (test) => {
        console.log(test)
    })
    socket.on('stop', (full) => {
        console.log('audio recording sent to backend')
        const wavBuffer = Buffer.from(full, 'base64');
        console.log(wavBuffer, 'wavBuffer')
        // [TRIAL AND ERROR] - MP3 conversion
        // const mp3Buffer = convertWavToMp3(wavBuffer);
        // console.log(mp3Buffer)
        const date = new Date();
        const fileName = `recordings-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}.m4a`;
        const recordingRef = ref(storage, `users/${socket.user.id}/distress/recordings/${fileName}`);
        const uploadtask = uploadBytesResumable(recordingRef, wavBuffer, {
            contentType: 'audio/m4a'
        });

        uploadtask.on('state_changed', (snapshot) => {
            // Observe state change events such as progress, pause, and resume
            // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Upload is ' + progress + '% done');
            switch (snapshot.state) {
                case 'paused':
                    console.log('Upload is paused');
                    break;
                case 'running':
                    console.log('Upload is running');
                    break;
            }
        }, (error) => {
            console.log(error, 'firebase upload error')
        }, () => {
            // Handle successful uploads on complete
            // For instance, get the download URL: https://firebasestorage.googleapis.com/...
            getDownloadURL(uploadtask.snapshot.ref).then(async (downloadURL) => {
                console.log('File available at', downloadURL);
                try {
                    // Find the most recent distress record for this user
                    const distress = await Distress.findOne({ 
                        user: socket.user.id,
                        resolved: false 
                    }).sort({ createdAt: -1 });

                    if (distress) {
                        if (!distress.audioRecordings) {
                            distress.audioRecordings = [];
                        }
                        distress.audioRecordings.unshift({url: downloadURL});
                        await distress.save();
                        console.log('Audio recording URL added to distress record');
                    }
                } catch (error) {
                    console.error('Error updating distress record with audio URL:', error);
                }
            });
        });
    })
})

// MongoDB connection setup
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/distress-server';

mongoose.connect(mongoURI, {
    // [TRIAL AND ERROR] - MongoDB connection options
    // useNewUrlParser: true,
    // useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((error) => {
    console.error('Error connecting to MongoDB:', error.message);
});

// Middleware setup
app.use(express.json())
app.use(cors())
app.use('/api', routes)

const PORT = process.env.PORT || 5000

// [TRIAL AND ERROR] - Johnny Five IoT setup
// const { Board, Led } = jf;
// const board = new Board({ port: 'COM6' });

// Adafruit IO MQTT setup
const IO_USERNAME = "olowodev"
const FEED_NAME = "deployDrone"

const mttqUrl = `mqtts://${IO_USERNAME}:${process.env.IO_KEY}@io.adafruit.com`
const mttqClient = mqtt.connect(mttqUrl)

mttqClient.on("connect", () => {
    console.log('connected to adafruit')
})

// [TRIAL AND ERROR] - LED control code
// board.on("ready", () => {
// const led = new Led(13); // Built-in LED on pin 13
// let blinkCount = 0;
// function blink() {
//     if (blinkCount < 10) {
//         led.on();
//         setTimeout(() => {
//             led.off();
//             setTimeout(blink, 100); // 1 sec off
//             blinkCount++;
//         }, 500); // 5 sec on
//     }
// }
// blink();
// });

// Drone deployment endpoint
app.post('/deploy', verifyTokenAndRole('admin'), async (request, response) => {
    const topic = `${IO_USERNAME}/feeds/deployDrone`;
    const message = 'Deploy Drone!';
    mttqClient.publish(topic, message, async () => {
        console.log('test');

        try {
            const distressId = request.body.distressId; // Assuming distressId is sent in the request body
            const distressAlert = await Distress.findById(distressId);
            if (!distressAlert) {
                return response.status(404).send({ msg: "Distress alert not found" });
            }

            distressAlert.droneDeployed = true;
            await distressAlert.save();

            response.status(200).send({ msg: "Drone deployed and distress alert updated" });
        } catch (error) {
            console.error('Error updating distress alert:', error.message);
            response.status(500).send({ msg: "Failed to update distress alert" });
        }
    });
});

// [TRIAL AND ERROR] - Emergency endpoint with hardcoded values
// app.post('/emergency', (request, response) => {
//     const { batteryLevel, location } = request.body;
//     // {"coords": {"accuracy": 5, "altitude": 79.51784883765079, "altitudeAccuracy": 30, "heading": -1, "latitude": 52.6296181498343, "longitude": -1.1209546978503624, "speed": -1}, "timestamp": 1747147173648.2593}
//     try {
//         client.messages
//             .create({
//                 // 10:32 AM, Aug 25, 2024
//                 // body: `Emergency! Battery level: ${batteryLevel}, Location: https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}`,
//                 body: `🔴 Distress Signal Sent by your contact Adetoun
// 📍 Current Location: https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}🗺️
// 🔗 Additional Details:
// Time Sent: ${new Date().toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true, month: 'short', day: 'numeric', year: 'numeric' })}
// Battery Level: ${Number(batteryLevel).toFixed(0)}%
// Phone Status: Silent Mode
// If you are nearby or can assist, please contact her or the authorities immediately! 🚑🚓
// Stay safe and act quickly.
// Escalate distress to admin: `,
//                 from: process.env.TWILIO_PHONE_NUMBER,
//                 to: process.env.EMERGENCY_PHONE_NUMBER
//             })
//             .then(message => {
//                 console.log(message.sid);
//                 response.status(200).send({ msg: "Emergency message sent" });
//             })
//             .catch(error => {
//                 console.error(error);
//                 response.status(500).send({ msg: "Failed to send emergency message" });
//             });
//     } catch (error) {
//         console.error(error);
//         response.status(500).send({ msg: "Failed to send emergency message" });
//     }
// })

export const transporter = nodemailer.createTransport({
    // Configure your SMTP settings here
    // host: process.env.SMTP_HOST,
    // port: Number(process.env.SMTP_PORT) || 587,
    // secure: false,
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// [TRIAL AND ERROR] - WAV to MP3 conversion function
function convertWavToMp3(wavBuffer) {
    // Convert Buffer to ArrayBuffer
    const binary = atob(wavBuffer)
    const len = binary.length
    const buffer = new Uint8Array(len)
    for (let index = 0; index < len; index++) {
        buffer[index] = binary.charCodeAt(i);
    }
    const arrayBuffer = wavBuffer.buffer.slice(
        wavBuffer.byteOffset,
        wavBuffer.byteOffset + wavBuffer.byteLength
    );
    const wav = lamejs.WavHeader.readHeader(new DataView(buffer));
    console.log(wav, 'wav')
    const mp3encoder = new lamejs.Mp3Encoder(wav.channels, wav.sampleRate, 128);
    console.log(mp3encoder, 'mp3encoder')
    const samples = new Int16Array(buffer, wav.dataOffset, wav.dataLen / 2);
    console.log(samples, 'samples')
    const mp3Data = [];

    const sampleBlockSize = 1152; // must be multiple of 576
    for (let i = 0; i < samples.length; i += sampleBlockSize) {
        const sampleChunk = samples.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }
    }

    const end = mp3encoder.flush();
    if (end.length > 0) {
        mp3Data.push(end);
    }
    console.log(mp3Data, 'mp3Data')

    return Buffer.concat(mp3Data);
}

// [TRIAL AND ERROR] - Validation endpoints
// app.get("/", query('filter').isString().notEmpty(), (request, response) => {
//     const result = validationResult(request)
//     const data = matchedData(request)
//     console.log('test')
//     response.status(200).send({ msg: "Hello, World!" })
// })

// app.post("/", checkSchema(createUserValidationSchema), (request, response) => {
//     const result = validationResult(request)
//     const data = matchedData(request)
//     console.log('test')
//     response.status(200).send({ msg: "Hello, World!" })
// })

// Start HTTP server
httpServer.listen(PORT, () => {
    console.log(`Running on Port ${PORT}`)
})

// [TRIAL AND ERROR] - Express server startup
// app.listen(PORT, () => {
//     console.log(`Running on Port ${PORT}`)
// })

transporter.verify((error, success) => {
    if (error) {
        console.error('SMTP configuration error:', error);
    } else {
        console.log('SMTP configuration is valid, ready to send emails.');
    }
});