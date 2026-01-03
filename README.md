# 📚 Reading Bot

Discord 독후감 카운트 봇 - 비트코인 & 자유주의 도서

## ✨ 기능
- `/독후감` - 나의 독서 현황 확인 (본인만 보임)
- `/초기화` - 기존 메시지 스캔하여 등록
- `/채널목록` - 등록된 채널 목록 확인
- 자동 등록/삭제

## 🚀 설치
```bash
npm install
cp .env.example .env
# .env에 토큰 입력
npm start
```

## 📦 PM2 실행
```bash
pm2 start bot.js --name "reading-bot"
pm2 save
```

## 📜 라이선스
MIT License