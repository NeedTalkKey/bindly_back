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