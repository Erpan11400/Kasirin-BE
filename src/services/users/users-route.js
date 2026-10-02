import { Router } from "express";
import { createUser, deleteUser, getAllUser } from "./users-controller.js";

const key = 'users'

const router = Router()

router.post('/', createUser)
router.get('/', getAllUser)
router.delete('/:id', deleteUser)

export default router