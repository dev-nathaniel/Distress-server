import { Router } from "express";
import usersRouter from './users.js'
import authRouter from './auth.js'
import distressRouter from './distress.js'

const router = Router()

router.get('/', (request, response) => {
    response.send({message: 'Active'})
})
router.use('/user', usersRouter)
router.use('/auth', authRouter)
router.use('/distress', distressRouter)

export default router