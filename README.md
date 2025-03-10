# 🐰 Bindly Backend
<h2 align="center"> 
<img src="https://github.com/user-attachments/assets/d7ee5fa0-d604-4e41-a4bd-5d05a97268fe" alt="long" border="0"></h2>

**Bindly** 프로젝트의 백엔드 코드베이스입니다. <br>이 저장소는 Bindly 애플리케이션의 서버 측 로직을 구현하며, 사용자 요청을 처리하고 데이터베이스와 상호 작용하는 역할을 담당합니다.

---

## 🚀 프로젝트 개요
Bindly Back은 다음과 같은 기능을 제공합니다:
- 사용자 인증 및 권한 관리
- API 요청 처리 및 데이터베이스 연동
- 토큰 기반 인증 시스템
- 미들웨어를 통한 요청 검증

## 📡 API 목록표
| API title                   | Method | 1st        | 2nd                   |
|----------------------------|--------|------------|-----------------------|
| 로그인하기                | post   | /auth      | /login                |
| 이메일 인증번호 발송      | post   | /auth      | /send                 |
| 이메일 인증번호 검증      | post   | /auth      | /verify-email         |
| 회원가입                  | post   | /auth      | /signup               |
| 아이디 중복검사           | post   | /auth      | /username-dupl-chk    |
| 텍스트 분석               | post   | /analysis  | -                     |
| 피드백 톡 리스트 조회     | get    | /chat      | /list                 |
| 피드백 톡 내용 조회       | post   | /chat      | /read                 |
| 피드백 톡 작성            | post   | /chat      | /create               |
| 인가코드 받기 (redirectURI) | get    | /kakao     | /callback             |

> 자세한 API 명세서는 [구글 공유 드라이브](https://drive.google.com/drive/folders/1U3F7XMk2j27VKxA5SLkQeIMc5FQZrKnR?usp=sharing)에서 보실 수 있습니다.

## 📂 디렉토리 구조
```
📦 bindly_back
├── 📂 controller      # 요청을 처리하는 컨트롤러 모듈
├── 📂 data            # 데이터베이스 모델 및 스키마 정의
├── 📂 middleware      # 미들웨어 함수
├── 📂 router          # 라우터 설정
├── 📜 app.js          # 애플리케이션의 진입점
├── 📜 config.js       # 환경 설정 파일
├── 📜 database.js     # 데이터베이스 연결 설정
├── 📜 tokenizeClient.js # 토큰화 클라이언트 모듈
└── 📜 package.json    # 프로젝트 설정 파일
```

## ⚙️ 설치 및 실행 방법
### 1️⃣ 저장소 클론
```sh
git clone https://github.com/NeedTalkKey/bindly_back.git
cd bindly_back
```

### 2️⃣ 의존성 설치
```sh
npm install
```

### 3️⃣ 환경 변수 설정
`config.js` 파일을 수정하여 필요한 환경 변수를 설정하세요.

### 4️⃣ 애플리케이션 실행
```sh
npm start
```

## 🤝 기여 방법
1. 저장소를 포크합니다.
2. 새로운 브랜치를 생성합니다 (`git checkout -b feature-branch`).
3. 변경 사항을 커밋합니다 (`git commit -m 'Add new feature'`).
4. 브랜치에 푸시합니다 (`git push origin feature-branch`).
5. 풀 리퀘스트를 생성합니다.


## 📜 라이선스

📝 이 프로젝트는 **MIT 라이선스** 하에 배포됩니다. 자유롭게 사용하세요! ✨

---
**Bindly** 프로젝트의 다른 Git도 둘러보세요!
> 🐇 [Bindly Front-end](https://github.com/NeedTalkKey/bindly_front)
> 
> ⚡ [Bindly Fast-API](https://github.com/NeedTalkKey/bindly_fastapi)
