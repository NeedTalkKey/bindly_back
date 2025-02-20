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

export async function findChatsDetailByChatObjectId(req, res, next) {
  const { objectId } = req.body;
  console.log("findChatsDetailByChatObjectId() objectId: ", objectId);
  try {
    const chat = await chatRepository.findChatById(objectId);
    if (chat) return res.json({ status: true, data: chat });
    else
      return res.json({
        status: false,
        message: "해당 ObjectId의 채팅이 존재하지 않습니다.",
      });
  } catch (e) {
    console.log(
      "controller / chat.js / findChatsDetailByChatObjectId / chatRepository.findChatById() catch",
      e
    );
  }
}

export async function createChat(req, res, next) {
  const { objectId, user_model } = req.payload;
  const { title, messages } = req.body;
  try {
    const newChat = await chatRepository.createChat(
      objectId,
      user_model,
      title,
      messages
    );
    return res.json({ status: true, data: newChat });
  } catch (e) {
    return res.json({
      status: false,
      message: "createChat 수행 중 Exception 발생",
    });
  }
}
