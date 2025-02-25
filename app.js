// app.js
import express from "express";
import cors from "cors";
import { connectDB } from "./database.js";
import { config } from "./config.js";
import authRouter from "./router/auth.js";
import kakaoRouter from "./router/kakao.js";
import chatRouter from "./router/chat.js";
import analysisRouter from "./router/analysis.js";
// import { initTokenizer } from "./tokenizerInit.js"; // ← 더 이상 필요 없음

// Top-level await 사용 (ES module 환경에서)
// await initTokenizer(); // ← 제거
// console.log("Tokenizer 초기화 완료");

await connectDB();
console.log("MongoDB 연결 성공");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", authRouter);
app.use("/kakao", kakaoRouter);
app.use("/chat", chatRouter);
app.use("/analysis", analysisRouter);

app.use((req, res, next) => {
  res.sendStatus(404);
});

app.listen(config.hosting.back_port, () => {
  console.log(`서버가 ${config.hosting.back_port}번 포트에서 실행 중...`);
});
