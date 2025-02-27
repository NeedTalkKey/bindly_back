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
      const negativeItem = result[0].find((item) => item.label === "LABEL_1");
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

    // 5) OpenAI GPT-4에 "공감"/"팩폭" 스타일로 문장 분석 및 개선(문제점+개선+변경) 요청
    const feedbackResults = [];
    for (let i = 0; i < topNegative.length; i++) {
      const neg = topNegative[i];
      const rank = i + 1; // TOP 1, TOP 2, TOP 3
      const basePrompt = `
[TOP ${rank}]
원문: "${neg.message}"

위 원문에 대해 다음 형식으로 답변해줘:
1) "개선:" => 이 문장의 문제점 및 개선 방법을 ${
        feedbackStyle === "공감" ? "부드럽게" : "직설적으로"
      } 설명
2) "변경:" => 문제점을 보완해 실제로 바꾼 문장 예시 (원문과 다른 표현 사용)

조건:
- 반드시 "원문"을 그대로 출력하지 말고, "개선:"과 "변경:"만 만들어.
- "개선:"에는 문제점과 수정 방향을 ${
        feedbackStyle === "공감" ? "공감하는 어조" : "팩폭 어조"
      }로 작성
- "변경:"에는 구체적인 예시 문장 하나를 제시
- 원문의 어투(반말/존댓말)는 유지, 하지만 표현은 바꿔야 함
- 최종 출력 형식은 예시:
개선: ...
변경: ...
`;

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4-turbo", // 실제 사용하시는 모델명으로 변경 가능 (ex: "gpt-3.5-turbo")
          messages: [{ role: "user", content: basePrompt }],
        });

        console.log("OpenAI raw completion:", JSON.stringify(completion, null, 2));

        let rawText;
        if (
          completion &&
          completion.choices &&
          completion.choices.length > 0 &&
          completion.choices[0].message &&
          completion.choices[0].message.content
        ) {
          rawText = completion.choices[0].message.content.trim();
        } else {
          console.error("Invalid OpenAI response:", completion);
          rawText = "[오류로 인해 문장 개선 실패]";
        }

        // === "개선:" 부분과 "변경:" 부분을 정규식으로 분리 ===
        const improvedRegex = /개선:\s*(.+?)(?=변경:|$)/s;
        const changedRegex = /변경:\s*(.+)/s;

        const improvedMatch = rawText.match(improvedRegex);
        const changedMatch = rawText.match(changedRegex);

        const improvedTextOnly = improvedMatch ? improvedMatch[1].trim() : "";
        const changedTextOnly = changedMatch ? changedMatch[1].trim() : "";

        feedbackResults.push({
          rank,
          original: neg.message,
          improvedText: improvedTextOnly,
          changedText: changedTextOnly,
          score: neg.score,
        });
      } catch (apiErr) {
        console.error("OpenAI API error:", apiErr);
        feedbackResults.push({
          rank,
          original: neg.message,
          improvedText: "[오류로 인해 문장 개선 실패]",
          changedText: "",
          score: neg.score,
        });
      }
    }

    // 6) 결과를 JSON으로 반환
    return res.json({ feedback: feedbackResults });
  } catch (error) {
    console.error("Feedback error:", error);
    return res.status(500).json({ error: "피드백 생성 중 오류 발생" });
  }
});

export default router;
