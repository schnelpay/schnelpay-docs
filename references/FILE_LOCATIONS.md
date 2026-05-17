# SchnelPay - File Locations

## 📂 Complete Structure
```
~/schnelpay/
│
├── project-docs/                    ← ALL DOCUMENTATION HERE
│   ├── README.md                   ← Start here!
│   ├── guides/
│   │   ├── PROJECT_STATE_SUMMARY.md
│   │   ├── WALLET_API_GUIDE.md
│   │   ├── TROUBLESHOOTING_GUIDE.md
│   │   ├── TRUMP_COIN_GUIDE.md
│   │   └── CHANGELOG.md
│   ├── references/
│   │   ├── QUICK_COMMANDS.md
│   │   └── FILE_LOCATIONS.md (this file)
│   └── chat-transcripts/
│       └── (your conversation logs)
│
├── schnelpay-backend/              ← YOUR CODE
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── database/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── services/
│   ├── package.json
│   ├── .env
│   └── tsconfig.json
│
└── docker-compose.yml
```

## 🎯 Where Everything Is

**Documentation:** `~/schnelpay/project-docs/`
**Code:** `~/schnelpay/schnelpay-backend/`
**Database config:** `~/schnelpay/docker-compose.yml`

## ✅ Quick Access

**Open docs:**
```bash
cd ~/schnelpay/project-docs
open README.md  # Mac
```

**Open code in VS Code:**
```bash
cd ~/schnelpay/schnelpay-backend
code .
```