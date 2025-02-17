import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import * as userRepository from "../data/user.js";
import * as authRepository from "../data/auth.js";
import { config } from "../config.js";

export async function login_logic(req, res, next) {
  try {
    const login_user = await userRepository.localLogin(req.body);
    const payload = {
      objectId: login_user._id,
      nickname: login_user.nickname,
    };
    const token = jwt.sign(payload, config.security.jwt_secret_key, {
      expiresIn: "1h",
    });
    return res.json({ status: true, token });
  } catch (error) {
    return res.json({ status: false, message: error.message });
  }
}

export async function username_dupl_chk(req, res, next) {
  const { username } = req.body;
  const existUser = userRepository.findByUsername(username);
  if (existUser)
    return res.json({ status: false, message: "이미 존재하는 아이디입니다" });
  else return res.json({ status: true, message: "사용 가능한 아이디입니다" });
}

export async function email_send(req, res, next) {
  // nodemailer 설정
  const transporter = nodemailer.createTransport({
    service: config.mailer.site,
    auth: {
      user: config.mailer.account,
      pass: config.mailer.password,
    },
  });

  const username = req.body.username;
  const auth_number = Math.floor(100000 + Math.random() * 900000).toString();

  // email 내용 구성
  const mailOptions = {
    from: config.mailer.account,
    to: req.body.receiver,
    subject: "Bindly 이메일 인증번호",
    text: `Bindly 이메일 인증번호: ${auth_number}\n타인에게 공유하지 마세요.`,
  };

  // email 전송
  transporter.sendMail(mailOptions, async (error, info) => {
    if (error) {
      console.error("이메일 전송 실패", error);
    } else {
      console.log("이메일 전송 성공", info.response);
      await authRepository.createAuth({
        username,
        auth_number,
      });
    }
  });

  return res.json({ status: true, data: "email send success" });
}

export async function verify_email(req, res, next) {
  try {
    const { username, auth_number } = req.body;

    // expire_time 만료 확인
    const valid_auth = await authRepository.findAuthByUsernameAndExpireTime(
      username
    );
    if (!valid_auth) {
      return res.json({ status: false, message: "인증번호가 만료되었습니다" });
    }
    // fail_cnt 5회 관련 방어
    else if (valid_auth.fail_cnt >= 5) {
      return res.json({
        status: false,
        message: "인증 5회 실패 관련 인증번호 재발급이 필요합니다",
      });
    }
    // 인증번호 비교 후 처리
    else {
      // 인증 성공
      if (valid_auth.auth_number == auth_number) {
        return res.json({
          status: true,
          message: "이메일 인증에 성공했습니다.",
        });
      }
      // 인증 실패
      const failIncreasedAuth = await authRepository.failCntIncrease(
        valid_auth._id
      );
      return res.json({
        status: false,
        message: `인증번호가 틀렸습니다.\n${failIncreasedAuth.fail_cnt}회 실패`,
      });
    }
  } catch (error) {
    return res.json({ status: false, message: error.message });
  }
}

export async function user_regist(req, res, next) {
  try {
    console.log(`user_regist req.body : `, req.body);
    const new_user = await userRepository.createLocalUser(req.body);
    console.log(`user_regist new_user : ${new_user}`);
    return res.json({ status: true, data: new_user });
  } catch (error) {
    return res.json({ status: false, message: error.message });
  }
}
