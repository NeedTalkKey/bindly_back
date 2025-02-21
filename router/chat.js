import express from "express";
import * as chatController from "../controller/chat.js";
import { isAuth } from "../middleware/jwt.js";

const router = express.Router();

router.post("/list", isAuth, chatController.findChatsByUserObjectId);
router.post("/detail", isAuth, chatController.findChatsDetailByChatObjectId);
router.post("/create", isAuth, chatController.createChat);
router.post("/create", isAuth);

export default router;
