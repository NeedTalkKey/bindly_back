// router/feedback.js
import express from "express";
import fetch from "node-fetch"; // npm install node-fetch
import { OpenAI } from "openai";
import { config } from "../config.js";

const router = express.Router();

// Hugging Face Inference API URL 및 토큰
const hfSentimentModelUrl = 'https://api-inference.huggingface.co/models/chihopark/bindly-sentiment-v6';
const hfToken = config.huggingface.apiToken; // config 파일 또는 환경변수에서 가져옴

// OpenAI API 설정 (v4 버전)
const openai = new OpenAI({ apiKey: config.openapi.apiKey });

// 헬퍼 함수: 허깅페이스 모델을 통해 부정 확률(score)을 가져오는 함수
async function getSentimentScore(sentence) {
  try {
    const response = await fetch(hfSentimentModelUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs: sentence, parameters: { truncation: true } }),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Sentiment Model API Error: ${response.status} - ${errText}`);
    }
    const result = await response.json();
    // 모델 결과 예시: [{ label: "LABEL_1", score: 0.72 }, ...]
    // 여기서는 result[0].score를 부정 확률로 사용 (실제 모델 출력에 따라 수정)
    return result[0]?.score || 0;
  } catch (error) {
    console.error("getSentimentScore 오류:", error);
    return 0;
  }
}

router.post("/feedback", async (req, res) => {
  try {
    const { conversationText, speaker, feedbackStyle } = req.body;
    if (!conversationText || !speaker || !feedbackStyle) {
      return res.status(400).json({ error: "필요한 인자가 없습니다." });
    }

    // 대화 텍스트를 "화자 : 메시지" 형식으로 파싱
    const lines = conversationText.split("\n").filter(line => line.includes(":"));
    const conversation = lines.map(line => {
      const parts = line.split(":");
      return { speaker: parts[0].trim(), message: parts.slice(1).join(":").trim() };
    });

    // 선택된 화자의 문장만 필터링
    const selectedSentences = conversation.filter(item => item.speaker === speaker && item.message);
    if (selectedSentences.length === 0) {
      return res.json({ message: "선택된 화자의 대화가 없습니다." });
    }

    // 각 문장에 대해 허깅페이스 모델을 통한 부정 확률 계산
    const sentencesWithScores = await Promise.all(
      selectedSentences.map(async (item) => {
        const score = await getSentimentScore(item.message);
        return { message: item.message, score };
      })
    );

    // 부정 확률이 0.5 이상인 문장만 필터링하고 내림차순 정렬 후 상위 3개 선택
    const negativeThreshold = 0.5;
    const negativeSentences = sentencesWithScores.filter(item => item.score > negativeThreshold);
    negativeSentences.sort((a, b) => b.score - a.score);
    const topNegative = negativeSentences.slice(0, 3);

    if (topNegative.length === 0) {
      return res.json({ message: "선택된 화자의 부정적인 문장이 없습니다." });
    }

    // 각 부정 문장에 대해 OpenAI API를 사용하여 피드백(개선된 문장) 생성
    const feedbackResults = [];
    for (const neg of topNegative) {
      const prompt = feedbackStyle === "공감"
        ? `다음 문장을 공감하는 어조로 부드럽게 순화된 문장으로 바꿔줘. 반드시 원문과 다른 표현을 사용해줘. 문장: "${neg.message}"`
        : `다음 문장을 솔직하게 문제점을 지적하는 어조로 개선된 문장으로 만들어줘. 반드시 원문과 다른 표현을 사용해줘. 문장: "${neg.message}"`;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [{ role: "user", content: prompt }],
      });
      const improved = completion.data.choices[0].message.content.trim();
      feedbackResults.push({
        original: neg.message,
        improved,
        score: neg.score,
      });
    }

    return res.json({ feedback: feedbackResults });
  } catch (error) {
    console.error("Feedback error:", error);
    return res.status(500).json({ error: "피드백 생성 중 오류 발생" });
  }
});

export default router;
