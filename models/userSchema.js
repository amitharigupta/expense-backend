const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
        trim: true
    },
    cpassword: {
        type: String,
        required: true,
        minlength: 6,
        trim: true
    },
    token: {
        type: String,
    },
    verifytoken: {
        type: String,
    }
})

const UserModel = new mongoose.model("users", userSchema)

module.exports = UserModel;