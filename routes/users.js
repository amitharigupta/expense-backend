var express = require('express');
var router = express.Router();
const UserController = require("../controllers/UserController");
const authMiddleWare = require("../middleware/auth");

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.post('/register', UserController.register);

router.post('/login', UserController.login);

router.get('/validuser', authMiddleWare.authenticate, UserController.validUser);

router.post('/logout', authMiddleWare.authenticate, UserController.logout)

router.post('/sendpasswordlink', UserController.sendPasswordLink);

router.get('/forgotpassword/:id', UserController.forgotPassword);

router.post('/:id', UserController.updatePassword)

module.exports = router;
