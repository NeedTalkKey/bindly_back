// router/feedback.js
import express from "express";
import fetch from "node-fetch";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// OpenAI v4
const { OpenAI } = require("openai");
import { config } from "../config.js";

const router = express.Router();

// Hugging Face Inference API URL 및 토큰
const hfSentimentModelUrl = "https://api-inference.huggingface.co/models/chihopark/bindly-sentiment-v6";
const hfToken = config.huggingface.apiToken || "";

// OpenAI API 설정 (v4)
// 실제 API 키, 모델 권한이 유효한지 반드시 확인!
const openai = new OpenAI({
  apiKey: config.openapi.apiKey, // 예: process.env.OPENAI_API_KEY
});

/**
 * 허깅페이스 모델(chihopark/bindly-sentiment-v6)을 사용해
 * 문장 하나당 부정 확률을 계산하는 함수.
 * 여기서는 결과 배열에서 LABEL_1의 score를 부정도로 간주합니다.
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
    // 모델 출력 예: [[ { label: "LABEL_0", score: 0.5864 }, { label: "LABEL_1", score: 0.4136 } ]]
    if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
      const negativeItem = result[0].find(item => item.label === "LABEL_1");
      return negativeItem ? negativeItem.score : 0;
    }
    return 0;
  } catch (error) {
    console.error("getSentimentScore 오류:", error);
    return 0;
  }
}

/**
 * 피드백 라우터
 * 요청 바디: { conversationText, speaker, feedbackStyle }
 * - conversationText: "[u1] 메시지\n[u2] 메시지\n" 형태
 * - speaker: "u1" 또는 "u2"
 * - feedbackStyle: "공감" or "팩폭"
 */
router.post("/feedback", async (req, res) => {
  try {
    const { conversationText, speaker, feedbackStyle } = req.body;
    if (!conversationText || !speaker || !feedbackStyle) {
      return res.status(400).json({ message: "필요한 인자가 없습니다." });
    }

    // 1) 대화 텍스트 파싱: "u1: 메시지" 형태
    const lines = conversationText.split(/\r?\n/).filter((line) => line.trim());
    const conversation = [];
    for (const line of lines) {
      // 예: "u1: 안녕, 오늘 어땠어?"
      const match = line.match(/^(u\d+):\s*(.*)$/);
      if (match) {
        const shortName = match[1];
        const message = match[2];
        conversation.push({ speaker: shortName, message });
      }
    }
    console.log("parsed conversation:", conversation);

    // 2) 선택된 화자의 문장만 필터링
    const selectedSentences = conversation.filter((c) => c.speaker === speaker);
    if (selectedSentences.length === 0) {
      return res.json({ message: "선택된 화자의 대화가 없습니다." });
    }

    // 3) 각 문장에 대해 허깅페이스 모델로 부정 확률 계산
    const negativityThreshold = 0.5;
    const scores = [];
    for (const item of selectedSentences) {
      const score = await getSentimentScore(item.message);
      scores.push({ message: item.message, score });
      console.log(`문장: "${item.message}" | 부정 Score (LABEL_1): ${score}`);
    }

    // 4) 부정 확률이 0.5 이상인 문장만 필터링, 내림차순 정렬 후 상위 3개 추출
    const negativeCandidates = scores.filter((x) => x.score >= negativityThreshold);
    negativeCandidates.sort((a, b) => b.score - a.score);
    const topNegative = negativeCandidates.slice(0, 3);

    if (topNegative.length === 0) {
      return res.json({ message: "선택된 화자의 부정적인 문장이 없습니다." });
    }

    // 5) OpenAI GPT-4 (또는 gpt-3.5-turbo)에 "공감"/"팩폭" 스타일로 문장 개선 요청
    const feedbackResults = [];
    for (const neg of topNegative) {
      const prompt =
        feedbackStyle === "공감"
          ? `다음 문장에 대하여 문제점과 개선점을 공감하는 어조로 부드럽게 순화시켜서 지적해줘. 반드시 원문과 다른 표현을 사용해줘. 개선된 문장의 예시는 출력하지마. 문장: "${neg.message}"`
          : `다음 문장에 대하여 문제점과 개선점을 솔직한 어조로 강하고 직설적으로 지적해줘. 반드시 원문과 다른 표현을 사용해줘. 개선된 문장의 예시는 출력하지마. 문장: "${neg.message}"`;

      try {
        // OpenAI API 호출 (주의: openai.chat.completions.create() 의 응답 구조)
        const completion = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [{ role: "user", content: prompt }],
        });

        // 디버그: 전체 응답 로그 출력
        console.log("OpenAI raw completion:", JSON.stringify(completion, null, 2));

        // 여기서 completion은 곧바로 최상위에 choices가 존재할 것으로 보임
        // (즉 completion.choices)
        let improved;
        if (
          completion &&
          completion.choices &&
          completion.choices.length > 0 &&
          completion.choices[0].message &&
          completion.choices[0].message.content
        ) {
          improved = completion.choices[0].message.content.trim();
        } else {
          console.error("Invalid OpenAI response:", completion);
          improved = "[오류로 인해 문장 개선 실패]";
        }

        feedbackResults.push({
          original: neg.message,
          improved,
          score: neg.score,
        });
      } catch (apiErr) {
        console.error("OpenAI API error:", apiErr);
        feedbackResults.push({
          original: neg.message,
          improved: "[오류로 인해 문장 개선 실패]",
          score: neg.score,
        });
      }
    }

    // 6) 결과 반환
    return res.json({ feedback: feedbackResults });
  } catch (error) {
    console.error("Feedback error:", error);
    return res.status(500).json({ error: "피드백 생성 중 오류 발생" });
  }
});

export default router;
