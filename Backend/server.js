require('dotenv').config()
const app = require('./src/app')
const connectToDB = require('./src/config/database')




connectToDB()


//for deployment, we will use the PORT provided by the environment variable, otherwise we will default to 3000 for local development
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})