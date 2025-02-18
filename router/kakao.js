import express from "express";
import jwt from "jsonwebtoken";
import { request } from "https";
import querystring from "querystring";
import { config } from "../config.js";
import * as kakaoRepository from "../data/kakao.js";

const router = express.Router();

// 카카오에서 보낸 인가 코드 받기 & 액세스 토큰 요청
router.get("/callback", (req, res) => {
  const code = req.query.code; // 카카오가 보낸 인가 코드
  if (!code) {
    return res.status(400).json({ error: "No authorization code provided" });
  }

  // 카카오 토큰 요청을 위한 데이터
  const tokenData = querystring.stringify({
    grant_type: "authorization_code",
    client_id: config.kakao.rest_api_key, // 카카오 REST API 키
    redirect_uri: config.kakao.redirect_uri, // 카카오에 등록한 리디렉트 URI
    code: code, // 사용자가 로그인 후 받은 인가 코드
  });

  const tokenOptions = {
    hostname: "kauth.kakao.com",
    path: "/oauth/token",
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(tokenData),
    },
  };

  // 🔹 3. 카카오에 POST 요청하여 액세스 토큰 받기
  const tokenReq = request(tokenOptions, (tokenRes) => {
    let data = "";

    tokenRes.on("data", (chunk) => {
      data += chunk;
    });

    tokenRes.on("end", () => {
      const tokenInfo = JSON.parse(data);
      if (tokenInfo.access_token) {
        getUserInfo(tokenInfo.access_token, res);
      } else {
        res
          .status(500)
          .json({ error: "Failed to get access token", details: tokenInfo });
      }
    });
  });

  tokenReq.on("error", (e) => {
    res.status(500).json({ error: "Request error", details: e.message });
  });

  tokenReq.write(tokenData);
  tokenReq.end();
});

// 액세스 토큰으로 카카오 사용자 정보 가져오기
function getUserInfo(accessToken, res) {
  const userInfoOptions = {
    hostname: "kapi.kakao.com",
    path: "/v2/user/me",
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`, // 액세스 토큰을 헤더에 포함
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };

  const userInfoReq = request(userInfoOptions, (userInfoRes) => {
    let data = "";

    userInfoRes.on("data", (chunk) => {
      data += chunk;
    });

    userInfoRes.on("end", async () => {
      const userInfo = JSON.parse(data);
      console.log("Kakao Login User Information : ", userInfo);
      let exist_user = await kakaoRepository.findKakaoByKId(userInfo.id);
      // DB에 없던 KAKAO 사용자인 경우
      if (!exist_user) {
        try {
          // DB에 KAKAO 유저 등록
          console.log("userInfo.id : ", userInfo.id);
          exist_user = await kakaoRepository.createKakaoUser({
            K_Id: userInfo.id.toString(),
            nickname: userInfo.properties["nickname"],
          });
        } catch (e) {
          // KAKAO 유저 등록 쿼리 중 오류
          console.log(e);
        }
      }
      const payload = {
        objectId: exist_user._id,
        nickname: exist_user.nickname,
      };
      const token = jwt.sign(payload, config.security.jwt_secret_key, {
        expiresIn: "1h",
      });

      // ✅ 프론트엔드 페이지로 리디렉트하면서 토큰 전달 (URL 쿼리 또는 쿠키 저장)
      res.redirect(
        `${
          config.kakao.front_redirect
        }/?token=${token}&nickname=${encodeURIComponent(
          userInfo.kakao_account.profile.nickname
        )}`
      );
    });
  });

  userInfoReq.on("error", (e) => {
    res
      .status(500)
      .json({ error: "Failed to fetch user info", details: e.message });
  });

  userInfoReq.end();
}

export default router;
