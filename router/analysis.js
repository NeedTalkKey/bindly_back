// router/analysis.js
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { config } from '../config.js';
import { getTokenChunks } from '../tokenizeClient.js'; // FastAPI 토큰화 서버 클라이언트

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// 라벨 → 한글 관계명 매핑 (관계 모델 결과)
const labelMap = {
  LABEL_0: "가족",
  LABEL_1: "기타",
  LABEL_2: "낯선 사람",
  LABEL_3: "연인",
  LABEL_4: "직장",
  LABEL_5: "친구",
};

/**
 * 카카오톡 대화 내역 정규화 함수
 */
function normalizeKakaoText(text) {
  const lines = text.split('\n').map(line => line.trim());
  const validLines = lines.filter(line => !line.startsWith('---------------') && line !== '');
  
  const parsed = validLines.map(line => {
    const match = line.match(/^\[([^\]]+)\]\s*\[[^\]]+\]\s*(.+)$/);
    if (match) {
      return { speaker: match[1], message: match[2] };
    }
    return null;
  }).filter(item => item !== null);
  
  const speakerMap = {};
  let speakerIndex = 1;
  parsed.forEach(item => {
    if (!speakerMap[item.speaker]) {
      speakerMap[item.speaker] = `u${speakerIndex++}`;
    }
  });
  
  const reverseMapping = {};
  for (const [name, short] of Object.entries(speakerMap)) {
    reverseMapping[short] = name;
  }
  
  const groups = [];
  let currentSpeaker = null;
  let currentGroup = [];
  const conversationMapping = {};
  
  parsed.forEach(item => {
    const shortName = speakerMap[item.speaker];
    
    // 화자별 전체 메시지 누적
    if (!conversationMapping[shortName]) {
      conversationMapping[shortName] = item.message;
    } else {
      conversationMapping[shortName] += " " + item.message;
    }
    
    // 연속 메시지 그룹화
    if (item.speaker === currentSpeaker) {
      currentGroup.push(item.message);
    } else {
      if (currentSpeaker !== null) {
        groups.push({ speaker: currentSpeaker, messages: currentGroup });
      }
      currentSpeaker = item.speaker;
      currentGroup = [item.message];
    }
  });
  if (currentGroup.length) {
    groups.push({ speaker: currentSpeaker, messages: currentGroup });
  }
  
  const outputGroups = [];
  const speakerFirstShown = {};
  
  // 기존 방식식
  // groups.forEach(group => {
  //   const shortName = speakerMap[group.speaker];
  //   if (!speakerFirstShown[group.speaker]) {
  //     // 기존: outputGroups.push(`[${shortName}] ${group.messages.join(" ")}`);
  //     outputGroups.push(`${shortName}: ${group.messages.join(" ")}`);
  //     speakerFirstShown[group.speaker] = true;
  //   } else {
  //     outputGroups.push(group.messages.join(" "));
  //   }
  // });

    // 수정
  groups.forEach(group => {
    const shortName = speakerMap[group.speaker];
    group.messages.forEach(msgLine => {
      // 화자가 바뀌든 아니든, 매 메시지마다 shortName: 메시지
      outputGroups.push(`${shortName}: ${msgLine}`);
    });
  });

  const normalizedText = outputGroups.join("\n");
  
  return {
    normalizedText,
    speakerMapping: reverseMapping,
    conversationMapping
  };
}

/**
 * 특정 화자의 전체 대화 내용 누적 (단축 이름 기준)
 */
function getSpeakerConversation(normalizedText, speakerId) {
  const lines = normalizedText.split('\n');
  const conversationLines = lines.filter(line => line.startsWith(`[${speakerId}]`));
  return conversationLines
    .map(line => line.replace(new RegExp(`^\\[${speakerId}\\]\\s*`), ""))
    .join("\n");
}

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
    }
    
    // 1) 파일 읽기
    const filePath = req.file.path;
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // 2) 대화 내역 정규화
    const { normalizedText, speakerMapping, conversationMapping } = normalizeKakaoText(fileContent);
    console.log("normalizedText:", normalizedText);
    console.log("speakerMapping:", speakerMapping);
    console.log("conversationMapping:", conversationMapping);
    
    // 모델 엔드포인트
    const relationshipModelUrl = 'https://api-inference.huggingface.co/models/kelly9457/bindly-R';
    const intimacyModelUrl = `${config.hosting.host_ip}:${config.hosting.back_port}/predict`; // FastAPI 통합 서버에서 /predict 제공
    console.log(intimacyModelUrl)
    const token = config.hosting.apiToken || config.huggingface.apiToken;
    
    // 3) 관계 모델 청킹 – FastAPI 토큰화 엔드포인트 사용
    const relationshipChunks = await getTokenChunks(normalizedText, 512, 50);
    console.log("Number of relationship chunks:", relationshipChunks.length);
    
    const relationshipChunkPromises = relationshipChunks.map(chunk =>
      fetch(relationshipModelUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: chunk, parameters: { truncation: true } }),
      }).then(async res => {
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`관계 모델 에러: ${res.status} - ${errText}`);
        }
        return res.json();
      })
    );
    
    // 4) 친밀도 모델 청킹 – FastAPI 토큰화 엔드포인트 사용
    const intimacyChunks = await getTokenChunks(normalizedText, 512, 50);
    console.log("Number of intimacy chunks:", intimacyChunks.length);
    
    const intimacyChunkPromises = intimacyChunks.map(chunk =>
      fetch(intimacyModelUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: chunk }),
      }).then(async res => {
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`친밀도 모델 에러: ${res.status} - ${errText}`);
        }
        return res.json();
      })
    );
    
    const [relationshipChunkResults, intimacyChunkResults] = await Promise.all([
      Promise.all(relationshipChunkPromises),
      Promise.all(intimacyChunkPromises),
    ]);
    
    // 5) 관계 모델 청크 결과 결합: 각 청크에서 최고 score 라벨 누적
    let labelScores = {
      LABEL_0: 0,
      LABEL_1: 0,
      LABEL_2: 0,
      LABEL_3: 0,
      LABEL_4: 0,
      LABEL_5: 0,
    };
    relationshipChunkResults.forEach(chunkResult => {
      if (!Array.isArray(chunkResult) || chunkResult.length === 0) return;
      const predictions = chunkResult[0]; // 각 청크 결과는 배열 형태
      const values = Object.values(predictions);
      let top = values[0];
      for (const v of values) {
        if (v.score > top.score) {
          top = v;
        }
      }
      if (labelScores.hasOwnProperty(top.label)) {
        labelScores[top.label] += top.score;
      }
    });
    let bestLabel = null;
    let bestScore = -Infinity;
    for (const lbl in labelScores) {
      if (labelScores[lbl] > bestScore) {
        bestScore = labelScores[lbl];
        bestLabel = lbl;
      }
    }
    console.log("Aggregated labelScores:", labelScores);
    console.log("Best label:", bestLabel);
    const predictedRelation = labelMap[bestLabel] || "알 수 없음";
    
    // 6) 친밀도 모델 청크 결과 결합: 각 청크 점수 평균
    let sumRaw = 0, sumScaled = 0;
    intimacyChunkResults.forEach(result => {
      sumRaw += result.raw_score || 0;
      sumScaled += result.scaled_score || 0;
    });
    const rawScore = intimacyChunkResults.length ? sumRaw / intimacyChunkResults.length : 0;
    const scaledScore = intimacyChunkResults.length ? sumScaled / intimacyChunkResults.length : 0;
    console.log("Raw intimacy score:", rawScore);
    console.log("Scaled intimacy score:", scaledScore);
    
    // 7) u1의 전체 대화 내용 예시
    const u1Conversation = getSpeakerConversation(normalizedText, 'u1');
    
    // 8) 임시 파일 삭제
    fs.unlink(filePath, (err) => {
      if (err) console.error("파일 삭제 오류:", err);
      else console.log("임시 파일 삭제됨:", filePath);
    });
    
    // 9) 최종 응답
    return res.json({
      normalizedText,
      speakerMapping,
      conversationMapping,
      predictedRelationship: predictedRelation,
      rawIntimacyScore: rawScore,
      totalScore: scaledScore,
    });
  } catch (error) {
    console.error('파일 분석 중 오류:', error.message);
    return res.status(500).json({ error: '파일 분석 중 오류가 발생했습니다.' });
  }
});

export default router;
