import mongoose from 'mongoose'

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL, {
            dbName: "kasirin_db"
        })
        console.log('MongoDB connection successfully!')
    } catch (error) {
        console.error(error)
        process.exit(1)
    }
}

export default connectDB