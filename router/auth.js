import express from "express";
import * as authController from "../controller/auth.js";

const router = express.Router();

router.post("/login", authController.login_logic);
router.post("/send-email", authController.email_send);
router.post("/verify-email");
router.post("/create", authController.user_regist);

export default router;
