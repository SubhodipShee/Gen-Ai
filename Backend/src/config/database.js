const mongoose = require('mongoose')

async function connectToDB() {
        try{await mongoose.connect(process.env.MONGO_URI)

        console.log('Connected to Database')
    }
        catch(error){
            console.error('Error connecting to Database:', error)
            process.exit(1) // stop the server so the host restarts it, instead of running without a database
        }
    
}
module.exports = connectToDB