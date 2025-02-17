import nodemailer from "nodemailer";
import * as userRepository from "../data/user.js";
import * as authRepository from "../data/auth.js";
import { config } from "../config.js";

export async function login_logic(req, res, next) {
  try {
    const login_user = await userRepository.localLogin(req.body);
    console.log(`login user : `, login_user);
    return res.json({ status: true, data: login_user });
  } catch (error) {
    return res.json({ status: false, message: error.message });
  }
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
    subject: "안녕하세요! Nodemailer 테스트입니다.",
    text: `Bindly 이메일 인증번호: ${auth_number}`,
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

export async function verify_email(req, res, next) {}

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
