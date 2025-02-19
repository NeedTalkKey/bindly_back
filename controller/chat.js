import jwt from "jsonwebtoken";
import { config } from "../config.js";
import * as chatRepository from "../data/chat.js";

export async function findChatsByUserObjectId(req, res, next) {
  const { objectId, user_model } = req.payload;
  const chatList = await chatRepository.findChatListByUserId(
    objectId,
    user_model
  );
  return res.json({ status: true, data: chatList });
}
