import express from "express";

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.sendStatus(404);
});

app.listen(8080);
