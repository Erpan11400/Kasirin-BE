import { Router } from "express";
import { login, refreshToken, logout } from "./login-controller.js";

const router = Router()

router.post('/login', login)
router.post('/refres-token', refreshToken)
router.post('/logout', logout)

export default router