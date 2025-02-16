import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const AuthSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // User의 ObjectId (User 스키마 참조)
    auth_number: { type: String, required: true }, // 인증 번호
    expire_time: { type: Date, required: true }, // 인증 만료 시간
    fail_cnt: { type: Number, default: 0, min: 0, max: 5 } // 인증 실패 횟수 (최대 5번)
}, {
    collection: 'auths',
    timestamps: true
});

const Auth = model('Auth', AuthSchema);
export default Auth;

// ===========
// 쿼리문 시작
// ===========

// CREATE (인증 정보 생성)
export async function createAuth(authData) {
    // authData: { user_id, auth_number, expire_time, fail_cnt }
    return await new Auth(authData).save();
}

// READ (특정 사용자의 인증 정보 조회)
export async function findAuthByUserId(user_id) {
    return await Auth.findOne({ user_id });
}

// UPDATE (인증 정보 업데이트)
export async function updateAuth(authId, updateData) {
    return await Auth.findByIdAndUpdate(authId, updateData, { new: true });
}

// DELETE (인증 정보 삭제)
export async function deleteAuth(authId) {
    return await Auth.findByIdAndDelete(authId);
}