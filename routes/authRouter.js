const { Router } = require("express");
const authController = require("../controllers/authController");

const authRouter = Router();

authRouter.get("/signup", authController.signupGet);
authRouter.post("/signup", authController.signupPost);

authRouter.get("/login", authController.loginGet);
authRouter.post("/login", authController.loginPost);

authRouter.post("/logout", authController.logoutPost);

module.exports = authRouter;
