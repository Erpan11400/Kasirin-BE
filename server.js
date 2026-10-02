import app from "./src/app.js"

const host = process.env.HOST
const port = process.env.PORT

app.listen(port, () => {
    console.log(`Server running at http://${host}:${port}`)
})