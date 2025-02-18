import mongoose from "mongoose";
const { Schema, model } = mongoose;

// 메시지 쌍 스키마 (Chat 내에서 사용)
const messagePairSchema = new Schema({
  aiMessage: { type: String, required: true }, // AI 응답 메시지 (AI의 응답이 먼저이기 때문에 순서 변경경)
  userMessage: { type: String, required: true }, // 사용자 메시지
  timestamp: { type: Date, default: Date.now },
});

const ChatSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "user_model", // 참조 모델
    },
    user_model: {
      type: String,
      required: true,
      enum: ["User", "Kakao"],
    },
    title: { type: String },
    messages: { type: [messagePairSchema], default: [] },
  },
  {
    collection: "chats",
    timestamps: true,
    versionKey: false,
  }
);

const Chat = model("Chat", ChatSchema);
export default Chat;

// ===========
// 쿼리문 시작
// ===========

// CREATE (채팅 기록 생성)
export async function createChat({ user_id, user_model, title, messages = [] }) {
  const chat = new Chat({
    user_id,
    user_model,
    title: title || "",
    messages,
  });
  return await chat.save();
}

// READ (특정 채팅 조회: _id)
export async function findChatById(chatId) {
  return await Chat.findById(chatId);
}

// READ (특정 사용자 전체 채팅 조회)
export async function findChatsByUserId(user_id, user_model) {
  return await Chat.find({ user_id, user_model }).select("title createdAt");
}

// ADD (기존 대화쌍에 대화 추가. AI의 응답이 먼저이기 때문)
export async function addMessage(chatId, aiMessage, userMessage) {
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new Error("채팅 내역이 존재하지 않습니다.");
  }
  chat.messages.push({
    aiMessage,
    userMessage,
    timestamp: new Date(),
  });
  return await chat.save();
}

// UPDATE (채팅 기록 업데이트)
export async function updateTitle( chatId, newTitle ) {
  return await Chat.findByIdAndUpdate(
    chatId,
    { $set: { title: newTitle }},
    { new: true}
  );
}

// DELETE (채팅 기록 삭제)
export async function deleteChat(chatId) {
  return await Chat.findByIdAndDelete(chatId);
}
