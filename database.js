import { config } from "./config.js";
import mongoose from "mongoose";

export async function connectDB() {
  return mongoose.connect(config.db.url);
}
