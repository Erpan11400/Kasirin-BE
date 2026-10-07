import * as dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import express from 'express';
import cors from 'cors'
import connectDB from './config/db.js'
import routes from './routes/app-router.js';
import ErrorHandler from './middlewares/error-handler.js';

const app = express()

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173'}))
app.use(express.json())
connectDB()
app.use('/api', routes)
app.use(ErrorHandler)

export default app