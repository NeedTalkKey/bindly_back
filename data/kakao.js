import mongoose from "mongoose";
const { Schema, model } = mongoose;

const KakaoSchema = new Schema(
  {
    K_Id: { type: String, required: true, unique: true }, // 카카오톡 고유 ID
    nickname: { type: String, required: true }, // 카카오 계정 닉네임
  },
  {
    collection: "kakao",
    timestamps: true,
    versionKey: false,
  }
);

const Kakao = model("Kakao", KakaoSchema);
export default Kakao;

// ===========
// 쿼리문 시작
// ===========

// CREATE (카카오 사용자 생성)
export async function createKakaoUser(kakaoData) {
  // kakaoData: { K_Id, nickname }
  return await new Kakao(kakaoData).save();
}

// READ (특정 카카오 사용자 조회: K_Id)
export async function findKakaoByKId(K_Id) {
  try {
    return await Kakao.findOne({ K_Id });
  } catch (e) {
    return undefined;
  }
}

// UPDATE (카카오 사용자 정보 업데이트)
export async function updateKakaoUser(K_Id, updateData) {
  return await Kakao.findOneAndUpdate({ K_Id }, updateData, { new: true });
}

// DELETE (카카오 사용자 삭제)
export async function deleteKakaoUser(K_Id) {
  return await Kakao.findOneAndDelete({ K_Id });
}

// 카카오 로그인
// 입력: K_Id (카카오 고유 ID), nickname (카카오톡 닉네임)
export async function kakaoLogin({ K_Id, nickname }) {
  // 1. 카카오 고유 ID로 사용자 조회
  let kakaoUser = await Kakao.findOne({ K_Id });
  // 2. 기록 없으면 신규 생성
  if (!kakaoUser) {
    kakaoUser = new Kakao({ K_Id, nickname });
    await kakaoUser.save();
  }
  // 카카오 로그인 성공 처리 (토큰 발급, 세션 생성 등은 추가 처리)
  return kakaoUser;
}
