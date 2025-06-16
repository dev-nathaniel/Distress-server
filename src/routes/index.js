import { Router } from "express";
import usersRouter from './users.js'
import authRouter from './auth.js'
import distressRouter from './distress.js'

// Create main router instance
const router = Router()

// Health check endpoint
// GET /
// Returns server status
router.get('/', (request, response) => {
    response.send({message: 'Active'})
})

// Mount route handlers
// User management routes - /user/*
router.use('/user', usersRouter)
// Authentication routes - /auth/*
router.use('/auth', authRouter)
// Distress alert routes - /distress/*
router.use('/distress', distressRouter)

export default router