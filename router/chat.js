import express from "express";
import * as chatController from "../controller/chat.js";
import { isAuth } from "../middleware/jwt.js";

const router = express.Router();

router.post("/chat/list", isAuth, chatController.findChatsByUserObjectId());
router.post("/chat/detail", isAuth);
router.post("/chat/create", isAuth);

export default router;
