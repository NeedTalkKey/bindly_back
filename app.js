import express from "express";
import cors from "cors";
import { connectDB } from "./database.js";
import { config } from "./config.js";
import authRouter from "./router/auth.js";
import kakaoRouter from "./router/kakao.js";
import chatRouter from "./router/chat.js";

const app = express();

app.use(cors());

app.use(express.json());

app.use("/auth", authRouter);
app.use("/kakao", kakaoRouter);
app.use("/chat", chatRouter);

app.use((req, res, next) => {
  res.sendStatus(404);
});

connectDB()
  .then(() => {
    app.listen(config.hosting.back_port);
  })
  .catch(() => console.error);
