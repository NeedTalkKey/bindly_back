import express from "express";
import { connectDB } from "./database";
import { config } from "./config";

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.sendStatus(404);
});

connectDB()
  .then(() => {
    app.listen(config.hosting.back_port);
  })
  .catch(() => console.error);
