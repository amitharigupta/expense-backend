const mongoose = require('mongoose');

const MONGO_URL = process.env.MONGO_URL;

function connectDB() {
    try {
        mongoose.connect(MONGO_URL, {
            useUnifiedTopology: true,
            useNewUrlParser: true
        })
        .then(() => {
            console.log(`Database connected successfully...`);
        })
        .catch((error) => {
            console.log(`Error while connnecting to Database : `, error);
        });
    } catch (error) {
        console.log(error);
    }
}

connectDB()




