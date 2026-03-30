# CLAUDE.md - Soundril

## Git 규칙 (필수)
- **커밋 금지**: 사용자가 명시적으로 요청하기 전까지 절대 `git commit` 실행 금지
- **푸시 금지**: 사용자가 명시적으로 요청하기 전까지 절대 `git push` 실행 금지
- 코드 수정 후 자동으로 커밋/푸시하지 말 것

## 프로젝트 개요
Soundril - AI 오디오 도구 서비스
- **AR → MR**: 오디오에서 반주(MR) 추출
- **AR → LRC**: 오디오 + 가사 → 타임스탬프 LRC 파일

## 프로젝트 구조
```
soundril/
├── apps/web/              # Next.js 15 앱 (Tailwind + shadcn/ui, 다크 테마)
│   └── src/
│       ├── app/           # App Router (페이지, API 라우트)
│       ├── components/    # React 컴포넌트
│       └── lib/           # Firebase, 유틸리티
├── tools/
│   └── lrc-generator/     # 로컬 LRC 생성 도구 (CLI + Gradio Web UI)
│       ├── generate.py    # CLI: python generate.py song.mp3 lyrics.txt
│       └── app.py         # Web UI: python app.py (localhost:3100)
└── workers/
    └── audio-processor/   # Cloud Run GPU 워커 (Python, FastAPI)
```

## 기술 스택
- **프론트엔드**: Next.js 15 (App Router), React 19, Tailwind CSS, shadcn/ui
- **인증**: Firebase Auth (Google 로그인) + 세션 쿠키
- **DB**: Firestore (users, jobs, creditTransactions)
- **스토리지**: Firebase Storage
- **워커**: Cloud Run GPU (NVIDIA L4), Python, FastAPI, Demucs, WhisperX
- **태스크 큐**: Cloud Tasks
- **패키지 매니저**: pnpm

## 크레딧 시스템
- 1크레딧 = 1분 오디오
- MR 추출: ceil(분) 크레딧
- LRC 생성: ceil(분) 크레딧
- LRC+MR: ceil(분) × 2 크레딧
- 가입 시 10크레딧 무료 제공

## Storage 경로
```
uploads/{uid}/{jobId}/{filename}     # 사용자 업로드
results/{uid}/{jobId}/mr.mp3         # MR 결과
results/{uid}/{jobId}/output.lrc     # LRC 결과
logs/{uid}/{jobId}/process.log       # 처리 로그
```

## 배포
- **웹**: Vercel (soundril.com)
- **워커**: Cloud Run GPU (asia-northeast3)
- **Firebase**: soundril GCP 프로젝트
