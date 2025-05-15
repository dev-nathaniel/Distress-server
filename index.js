import express from "express";
import { param, query, body, validationResult, matchedData, checkSchema } from "express-validator";
import { createUserValidationSchema } from "./src/utils/validationSchema.js";
import routes from './src/routes/index.js'
// Your AccountSID and Auth Token from console.twilio.com
import  Twilio  from 'twilio';
import mqtt from "mqtt";
import dotenv from 'dotenv';
import Distress from "./src/models/Distress.js"; // Corrected to use the Distress model
import mongoose from "mongoose";
dotenv.config();



export const client = new Twilio(process.env.accountSid, process.env.authToken);
// import jf from "johnny-five";
import cors from 'cors'

const app = express()

const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/distress-server';

mongoose.connect(mongoURI, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((error) => {
    console.error('Error connecting to MongoDB:', error.message);
});


app.use(express.json())
app.use(cors())
app.use('/api', routes)

const PORT = process.env.PORT || 5000

// const { Board, Led } = jf;

// const board = new Board({ port: 'COM6' });

const IO_USERNAME = "olowodev"
const FEED_NAME = "deployDrone"

const mttqUrl = `mqtts://${IO_USERNAME}:${process.env.IO_KEY}@io.adafruit.com`
const mttqClient = mqtt.connect(mttqUrl)

mttqClient.on("connect", () => {
    console.log('connected to adafruit')
})
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
app.post('/deploy', async (request, response) => {
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

app.post('/emergency', (request, response) => {
    const { batteryLevel, location } = request.body;
    // {"coords": {"accuracy": 5, "altitude": 79.51784883765079, "altitudeAccuracy": 30, "heading": -1, "latitude": 52.6296181498343, "longitude": -1.1209546978503624, "speed": -1}, "timestamp": 1747147173648.2593}
    try {
        client.messages
            .create({
                // 10:32 AM, Aug 25, 2024
                // body: `Emergency! Battery level: ${batteryLevel}, Location: https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}`,
                body: `🔴 Distress Signal Sent by your contact Adetoun
📍 Current Location: https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}🗺️
🔗 Additional Details:
Time Sent: ${new Date().toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true, month: 'short', day: 'numeric', year: 'numeric' })}
Battery Level: ${Number(batteryLevel).toFixed(0)}%
Phone Status: Silent Mode
If you are nearby or can assist, please contact her or the authorities immediately! 🚑🚓
Stay safe and act quickly.
Escalate distress to admin: `,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: process.env.EMERGENCY_PHONE_NUMBER
            })
            .then(message => {
                console.log(message.sid);
                response.status(200).send({msg: "Emergency message sent"});
            })
            .catch(error => {
                console.error(error);
                response.status(500).send({msg: "Failed to send emergency message"});
            });
    } catch (error) {
        console.error(error);
        response.status(500).send({msg: "Failed to send emergency message"});
    }
})






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

app.listen(PORT, () => {
    console.log(`Running on Port ${PORT}`)
})