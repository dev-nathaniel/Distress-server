import express from "express";
import { param, query, body, validationResult, matchedData, checkSchema } from "express-validator";
import { createUserValidationSchema } from "./src/utils/validationSchema.js";
import routes from './src/routes/index.js'
import jf from "johnny-five";
import cors from 'cors'

const app = express()

app.use(express.json())
app.use(cors())
app.use(routes)

const PORT = process.env.PORT || 5000

const { Board, Led } = jf;

const board = new Board({ port: 'COM6' });

app.post('/deploy', (request, response) => {

    // board.on("ready", () => {
        const led = new Led(13); // Built-in LED on pin 13

        function blink() {
            led.on();
            setTimeout(() => {
                led.off();
                setTimeout(blink, 100); // 1 sec off
            }, 500); // 5 sec on
        }

        blink();
    // });
    console.log('test')
    response.status(200).send({msg: "Drone deployed"})
})



app.get("/", query('filter').isString().notEmpty(), (request, response) => {
    const result = validationResult(request)
    const data = matchedData(request)
    response.status(200).send({ msg: "Hello, World!" })
})

app.post("/", checkSchema(createUserValidationSchema), (request, response) => {
    const result = validationResult(request)
    const data = matchedData(request)
    response.status(200).send({ msg: "Hello, World!" })
})

app.listen(PORT, () => {
    console.log(`Running on Port ${PORT}`)
})