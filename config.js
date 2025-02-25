import dotenv from "dotenv";

dotenv.config();

function getEnvValueWithDefault(key, defaultValue = undefined) {
  return process.env[key] || defaultValue;
}

export const config = {
  hosting: {
    front_port: getEnvValueWithDefault("FRONT_PORT"),
    back_port: getEnvValueWithDefault("BACK_PORT"),
    model_port: getEnvValueWithDefault("MODEL_PORT"),
    host_ip: getEnvValueWithDefault("HOST_IP")
  },
  db: {
    url: getEnvValueWithDefault("MONGO_URL"),
    db_name: getEnvValueWithDefault("DATABASE_NAME"),
  },
  mailer: {
    site: getEnvValueWithDefault("MAIL_SITE"),
    account: getEnvValueWithDefault("GMAIL_ACCOUNT"),
    password: getEnvValueWithDefault("GAMIL_PASSWORD"),
  },
  security: {
    salt_round: getEnvValueWithDefault("SALT_ROUND"),
    jwt_secret_key: getEnvValueWithDefault("JWT_SECRET_KEY"),
  },
  kakao: {
    rest_api_key: getEnvValueWithDefault("REST_API_KEY"),
    redirect_uri: getEnvValueWithDefault("REDIRECT_URI"),
    front_redirect: getEnvValueWithDefault("FRONT_REDIRECT"),
  },
  huggingface: {
    apiToken: getEnvValueWithDefault("HF_API_TOKEN"),
  },
  openapi: {
    apiKey: getEnvValueWithDefault("OA_API_KEY"),
  },
};
