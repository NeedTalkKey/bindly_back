import jwt from "jsonwebtoken";
import { config } from "../config.js";

export const isAuth = async (req, res, next) => {
  const authHeader = req.get("Authorization");

  if (!(authHeader && authHeader.startsWith("Bearer "))) {
    return res.json({
      status: false,
      message: "jwt 토큰을 Header로 전달받지 못했습니다",
    });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, config.jwt.secretKey, async (error, decoded) => {
    if (error) {
      return res.json({
        status: false,
        message: "jwt 토큰이 올바르지 않습니다",
      });
    }
    print("decoded", decoded);
    req.payload = decoded;
    next();
  });
};
