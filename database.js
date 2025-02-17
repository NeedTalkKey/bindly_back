import { config } from "./config.js";
import mongoose from "mongoose";

export async function connectDB() {
  try {
    await mongoose.connect(config.db.url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB 연결 성공");
  } catch (error) {
    console.error("MongoDB 연결 오류:", error);
  }
}
