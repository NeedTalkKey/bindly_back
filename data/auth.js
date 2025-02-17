import mongoose from "mongoose";
const { Schema, model } = mongoose;

const AuthSchema = new Schema(
  {
    username: { type: String, required: true }, // username
    auth_number: { type: String, required: true }, // 인증 번호
    expire_time: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 3 * 60 * 1000),
    }, // 현재 시간 + 3분
    fail_cnt: { type: Number, default: 0, min: 0, max: 5 }, // 인증 실패 횟수 (최대 5번)
  },
  {
    collection: "auths",
    timestamps: true,
  }
);

const Auth = model("Auth", AuthSchema);
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
export async function findAuthByUsernameAndExpireTime(username) {
  return await Auth.findOne({
    username,
    expire_time: { $gt: new Date() },
  }).sort({
    createdAt: -1,
  });
}

// UPDATE (인증 정보 업데이트)
export async function failCntIncrease(objectId) {
  return await Auth.findOneAndUpdate(
    { _id: objectId },
    { $inc: { fail_cnt: 1 } }, // $inc : 기존 fail_cnt 값에서 1 증가
    { new: true } // 업데이트된 문서 반환
  );
}

// DELETE (인증 정보 삭제)
export async function deleteAuth(authId) {
  return await Auth.findByIdAndDelete(authId);
}
