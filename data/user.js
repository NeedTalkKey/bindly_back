import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { config } from "../config.js";
const { Schema, model } = mongoose;

const UserSchema = new Schema(
  {
    nickname: { type: String, required: true }, // 닉네임
    username: { type: String, required: true, unique: true }, // 아이디
    password: { type: String, required: true }, // 비밀번호
    email: { type: String, required: true }, // 이메일
  },
  {
    collection: "users",
    timestamps: true,
    versionKey: false,
  }
);

const User = model("User", UserSchema);
export default User;

// ===========
// 쿼리문 시작
// ===========
export async function createLocalUser({ username, password, email, nickname }) {
  try {
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      throw new Error("이미 존재하는 username 또는 email입니다.");
    }
    const saltRounds = parseInt(config.security.salt_round);
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newUser = new User({
      username,
      password: hashedPassword,
      email,
      nickname,
    });
    console.log("newUser: ", newUser);
    await newUser.save();
    console.log("await newUser.save(); 뒤");
    return newUser;
  } catch (error) {
    throw error;
  }
}

// 특정 사용자 조회 (ID로 조회)
export async function getUserById(userId) {
  try {
    const user = await User.findById(userId);
    return user;
  } catch (error) {
    throw error;
  }
}

export async function findByUsername(username) {
  try {
    const user = await User.findOne({ username });
    return user;
  } catch (error) {
    return undefined;
  }
}

// 사용자 정보 업데이트 (예: 비밀번호, 닉네임 변경)
export async function updateUser(userId, updateData) {
  try {
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    });
    return updatedUser;
  } catch (error) {
    throw error;
  }
}

// 사용자 삭제
export async function deleteUser(userId) {
  try {
    const deletedUser = await User.findByIdAndDelete(userId);
    return deletedUser;
  } catch (error) {
    throw error;
  }
}

// 로컬 로그인
// 사용 필드: username, password
export async function localLogin({ username, password }) {
  // 1. 아이디로 사용자 조회
  const user = await User.findOne({ username });
  if (!user) {
    throw new Error("해당 아이디의 사용자가 존재하지 않습니다.");
  }

  // 2. 비밀번호 검증 (비교는 bcrypt.compare)
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("비밀번호가 일치하지 않습니다.");
  }

  // 로그인 성공 (토큰 발급, 세션 생성 등은 추가 처리)
  return user;
}
