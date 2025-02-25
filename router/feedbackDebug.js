// router/feedbackDebug.js
import express from "express";
import fetch from "node-fetch";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { OpenAI } = require("openai"); // v4 방식 사용
import { config } from "../config.js";

const router = express.Router();

// Hugging Face Inference API URL 및 토큰
const hfSentimentModelUrl = "https://api-inference.huggingface.co/models/chihopark/bindly-sentiment-v6";
const hfToken = config.huggingface.apiToken || "";

/**
 * 허깅페이스 모델을 이용하여 단일 문장에 대한 감성(부정도) 결과를 가져오는 함수
 */
async function getSentimentScore(sentence) {
  try {
    const response = await fetch(hfSentimentModelUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: sentence,
        parameters: { truncation: true },
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Sentiment Model API Error: ${response.status} - ${errText}`);
    }
    const result = await response.json();
    return result; // 전체 결과 반환 (예: [{ label: "LABEL_0", score: 0.12 }, { label: "LABEL_1", score: 0.88 }])
  } catch (error) {
    console.error(`getSentimentScore 오류 (문장: "${sentence}") :`, error);
    return null;
  }
}

/**
 * 디버깅용 라우터:
 * 요청 바디: { conversationText }
 * conversationText는 "u1: 메시지" 형태의 여러 줄 텍스트라고 가정.
 * 각 줄마다 모델이 계산한 결과를 콘솔에 출력하고, 전체 결과를 JSON으로 반환합니다.
 */
router.post("/debug-sentiment", async (req, res) => {
  try {
    const { conversationText } = req.body;
    if (!conversationText) {
      return res.status(400).json({ message: "conversationText가 필요합니다." });
    }
    // Windows, Unix 줄바꿈 모두 처리
    const lines = conversationText.split(/\r?\n/).filter(line => line.trim());
    const conversation = [];
    // "u1: 메시지" 형식 파싱 (정규식 수정)
    for (const line of lines) {
      const match = line.match(/^(u\d+):\s*(.*)$/);
      if (match) {
        const speaker = match[1];
        const message = match[2];
        conversation.push({ speaker, message });
      }
    }

    console.log("=== 파싱된 대화 ===");
    console.log(conversation);

    // 각 문장마다 부정도 계산 후 로그 찍기
    const debugResults = [];
    for (const item of conversation) {
      const modelOutput = await getSentimentScore(item.message);
      // 예시로, 모델 출력 중 부정 확률이 LABEL_1에 해당한다고 가정한다면:
      // (실제 모델 문서를 참고하여 어떤 레이블이 부정인지 확인 필요)
      let negativeScore = 0;
      if (modelOutput && Array.isArray(modelOutput)) {
        // 예시: LABEL_1이 부정이라고 가정하면,
        const negativeItem = modelOutput.find(x => x.label === "LABEL_1");
        if (negativeItem) {
          negativeScore = negativeItem.score;
        }
      }
      console.log(`문장: "${item.message}" | 부정 Score: ${negativeScore}`);
      debugResults.push({
        speaker: item.speaker,
        message: item.message,
        modelOutput,
        negativeScore,
      });
    }
    return res.json({ debug: debugResults });
  } catch (error) {
    console.error("debug-sentiment 라우터 오류:", error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
