import nodemailer from "nodemailer";
import * as userRepository from "../data/user.js";
import { config } from "../config.js";

// nodemailer 설정
const transporter = nodemailer.createTransport({
  service: config.mailer.site,
  auth: {
    user: config.mailer.account,
    pass: config.mailer.password,
  },
});

export async function login_logic(req, res, next) {
  const { username, password } = req.body;
  // username으로 계정 조회

  // password 복호화 및 비교
}

export async function email_send(req, res, next) {
  // email 내용 구성
  const mailOptions = {
    from: config.mailer.account,
    to: req.body.receiver,
    subject: "안녕하세요! Nodemailer 테스트입니다.",
    text: `Bindly 이메일 인증번호: ${Math.floor(
      100000 + Math.random() * 900000
    ).toString()}\n`,
  };

  // email 전송
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("이메일 전송 실패", error);
    } else {
      console.log("이메일 전송 성공", info.response);
    }
  });
}
