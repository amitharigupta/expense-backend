const bcrypt = require('bcrypt');
const saltRounds = 10;
const UserModel = require("../models/userSchema");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
var shortUrl = require("node-url-shortener");

// Email Config

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.MAIL_USER || "amitgt9967@gmail.com",
        pass: process.env.MAIL_PASSWORD || "1234567",
    }
})

async function hashPassword(password) {
    let hashPassword = await bcrypt.hash(password, saltRounds);
    return hashPassword;
}

async function comparePassword(password, hashPassword) {
    return bcrypt.compare(password, hashPassword);
}

module.exports = {
    register: async (req, res, next) => {
        try {
            let { name, email, password, cpassword } = req.body;

            logging.info('UserController : register : ' + req.body);

            if (!name || !email || !password || !cpassword) {
                return res.status(422).json({ status: 422, message: "Fill all Details" });
            }

            let userExist = await UserModel.findOne({ email });
            if (userExist) return res.status(401).json({ status: 401, message: "User Already Exist" });
            else if (password != cpassword) return res.status(422).json({ status: 422, message: "Password and Confirm Password does not match" });

            password = await hashPassword(password);
            cpassword = password ? password : await hashPassword(password);

            let userObj = {
                name,
                email,
                password,
                cpassword
            }

            const finalUser = new UserModel(userObj);
            const saveUser = await finalUser.save();
            if (saveUser) {
                return res.status(201).json({ status: 201, message: "User Created Successfully" });
            } else {
                return res.status(401).json({ status: 401, message: "Error While creating user" });
            }

        } catch (error) {
            console.log(error);
            return res.status(500).json({ status: 500, message: "Internal Server Error" })
        }
    },

    login: async (req, res, next) => {
        try {
            let { email, password } = req.body;

            logging.info('UserController : login : ' + JSON.stringify(req.body));

            if (!email || !password) {
                return res.json({ status: 400, message: "Please enter valid details" });
            }

            let userExist = await UserModel.findOne({ email });

            if (!userExist) return res.json({ status: 400, message: "Invalid email and password" });

            let isMatch = await comparePassword(password, userExist.password);
            if (!isMatch) return res.json({ status: 400, message: "Invalid email and password" });

            let payload = {
                name: userExist.name,
                email: userExist.email
            }
            let token = jwt.sign(payload, process.env.TOKEN_SECRET, { expiresIn: "1h" });

            const saveToken = new UserModel({ token: token });

            if (saveToken) {
                res.cookie("usercookie", token, {
                    expiresIn: new Date(Date.now() + 9000000),
                    httpOnly: true
                })
                return res.json({ status: 200, message: "User logged in successfully", data: { ...payload, token } });
            } else {
                return res.json({ status: 400, message: "Error while loggin in" });
            }

        } catch (error) {
            console.log(error);
        }
    },

    validUser: async (req, res, next) => {
        try {
            const validUser = await UserModel.findOne({ email: req.rootUser.email, id: req.userId });

            if (validUser) {
                return res.status(200).json({ status: 200, message: "User is Authenticated", data: validUser });
            } else {
                return res.status(401).json({ status: 401, message: "Not a valid User" });
            }

        } catch (error) {
            return res.json({ status: 500, message: "Internal Server Error" });
        }
    },

    logout: async (req, res, next) => {
        try {
            console.log('req : ', req);
            const token = req.token;
            console.log(token);

            res.clearCookie("usercookie", { path: "/" });

            req.rootUser.save();

            if (req.rootUser) {
                return res.status(200).json({ status: 200, message: "User logout successfully", data: req.token });
            } else {
                return res.status(401).json({ status: 401, message: "Not a valid User" });
            }

        } catch (error) {
            return res.json({ status: 500, message: "Internal Server Error" });
        }
    },

    sendPasswordLink: async (req, res, next) => {
        try {
            let { email } = req.body;
            if (!email) {
                return res.status(200).json({ status: 400, message: "Please enter valid mail" });
            }

            let user = await UserModel.findOne({ email });
            if(!user) {
                return res.status(200).json({ status: 400, message: "User Not Found" });
            }

            // Token creation for password reset
            let payload = {
                name: user.name,
                email: user.email
            }
            let token = jwt.sign(payload, process.env.TOKEN_SECRET, { expiresIn: "60s" });

            const setUserToken = await UserModel.findByIdAndUpdate({ _id: user._id}, { verifytoken: token }, { new: true });
            let textMessage = `This link is valid for 2 mins https://gray-plumber-wbhna.ineuron.app:5173/forgot-password/${user._id}`;
            if(setUserToken) {
                const mailOptions = {
                    from : process.env.MAIL_USER,
                    to : user.email,
                    subject: `Sending Email For Password Reset`,
                    text: textMessage
                }
                console.log(mailOptions.text)
                transporter.sendMail(mailOptions, (error, info) => {
                    if(error) { 
                        console.log("Error: ", error); 
                        return res.status(401).json({ status: 401, message: "Email not send" });
                    } else {
                        console.log("Email Sent");
                        return res.status(201).json({ status: 201, message: "Email sent successfully" });
                    }
                })
            } else {

            }
        } catch (error) {
            return res.json({ status: 500, message: "Internal Server Error" });
        }
    },

    // verify user for forgot password
    forgotPassword: async (req, res, next) => {
        try {
            console.log(req.params);

            const { id }  = req.params;

            const validUser = await UserModel.findOne({ _id: id });
            if(!validUser) {
                return res.status(200).json({ status: 401, message: "User Not Found" });
            }
            
            if(validUser) {
                return res.status(201).json({ status: 201, message: "Valid User", data: validUser });
            } else {
                return res.status(200).json({ status: 401, message: "Error while vaildating" });
            }

        } catch (error) {
            console.log(error);
            return res.json({ status: 500, message: "Internal Server Error" });
        }
    },

    updatePassword: async (req, res, next) => {
        try {
            const { id } = req.params;

            const { password, token } = req.body;
            if(!password) {
                return res.status(200).json({ status: 401, message: "Please enter password" });
            }
            const validUser = await UserModel.findOne({ _id: id, verifytoken: token });
            const validToken = jwt.verify(token, process.env.TOKEN_SECRET);
            if(!validUser) {
                return res.status(200).json({ status: 401, message: "User Not Found" });
            }

            if(!validToken) {
                return res.status(200).json({ status: 401, message: "Token is not valid" });
            }

            if(validUser && validToken) {
                let newPassword = await bcrypt.hash(password, 10);
                await UserModel.findByIdAndUpdate({ _id: validUser._id }, { password: newPassword });

                return res.status(201).json({ status: 201, message: "Password updated successfully"});
            } else {
                return res.status(200).json({ status: 401, message: "Error while vaildating" });
            }
        } catch (error) {
            return res.json({ status: 500, message: "Internal Server Error" });
        }
    }
}