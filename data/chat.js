import mongoose from 'mongoose';
const { Schema, model } = mongoose;

// 메시지 쌍 스키마 (Chat 내에서 사용)
const messagePairSchema = new Schema({
    userMessage: { type: String, required: true }, // 사용자 메시지
    aiMessage: { type: String, required: true }, // AI 응답 메시지
    timestamp: { type: Date, default: Date.now }
});

const ChatSchema = new Schema({
    user_id: { 
        type: Schema.Types.ObjectId, 
        required: true, 
        refPath: 'user_model' // 참조 모델
    },
    user_model: { 
        type: String, 
        required: true, 
        enum: ['User', 'Kakao'] 
    },
    title: { type: String },
    messages: { type: [messagePairSchema], default: [] }
}, {
    collection: 'chats',
    timestamps: true
});

const Chat = model('Chat', ChatSchema);
export default Chat;

// ===========
// 쿼리문 시작
// ===========

// CREATE (채팅 기록 생성)
export async function createChat(chatData) {
    // chatData: { user_id, user_model, title, messages: [] }
    return await new Chat(chatData).save();
}

// READ (특정 채팅 조회: _id)
export async function findChatById(chatId) {
    return await Chat.findById(chatId);
}

// READ (특정 사용자 전체 채팅 조회)
export async function findChatsByUserId(userId) {
    return await Chat.find({ user_id: userId });
}

// UPDATE (채팅 기록 업데이트)
export async function updateChat(chatId, updateData) {
    return await Chat.findByIdAndUpdate(chatId, updateData, { new: true });
}

// DELETE (채팅 기록 삭제)
export async function deleteChat(chatId) {
    return await Chat.findByIdAndDelete(chatId);
}