import { Router } from "express";
import kasirRoute from '../services/pos/kasir-route.js'
import authRoute from '../services/auth/login-route.js'
import roleRoute from '../services/role/role-route.js'
import userRoute from "../services/users/users-route.js";
import categoriesRoute from '../services/categories/categories-route.js'
import productsRoute from '../services/products/product-route.js'
import transactionsRoute from '../services/transactions/transaction-route.js'
import inisialRoute from '../services/inisial_data/inisial-data.js'
import response from "../utils/response.js";

const router = Router()

router.get('/', (_, res) => {
    return response(res, 200, 'Anda berhasil membuat default API', { timestamp: new Date().toISOString() })
})

// Authenticatiion
router.use('/auth', authRoute)
// Kasir
router.use('/pos', kasirRoute)
// Role
router.use('/roles', roleRoute)
// Users
router.use('/users', userRoute)
// Categories
router.use('/categories', categoriesRoute)
// Product
router.use('/products', productsRoute)
// Transaction
router.use('/transactions', transactionsRoute)
// Inisial Data
router.use('/initial', inisialRoute)

export default router