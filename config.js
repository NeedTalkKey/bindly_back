import dotenv from "dotenv";

dotenv.config();

function getEnvValueWithDefault(key, defaultValue = undefined) {
  return process.env[key] || defaultValue;
}

export const config = {
  db: {
    url: getEnvValueWithDefault("MONGO_URL"),
    db_name: getEnvValueWithDefault("DATABASE_NAME"),
  },
  mailer: {
    site: getEnvValueWithDefault("MAIL_SITE"),
    account: getEnvValueWithDefault("GMAIL_ACCOUNT"),
    password: getEnvValueWithDefault("GAMIL_PASSWORD"),
  },
};
