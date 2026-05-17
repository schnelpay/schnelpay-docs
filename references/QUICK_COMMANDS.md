# SchnelPay - Quick Command Reference
## Copy-Paste Ready Commands

---

## 🚀 Daily Startup
```bash
# 1. Start Docker
cd ~/schnelpay
docker-compose up -d

# 2. Start API Server
cd schnelpay-backend
npm run dev

# 3. Verify running
docker ps  # Should show 2 containers
curl http://localhost:3000/health
```

---

## 🔑 Get Authentication Token
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@test.com","password":"password123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "Token: $TOKEN"
```

---

## 💳 Wallet Commands

**View wallets:**
```bash
curl -X GET http://localhost:3000/api/v1/wallets \
  -H "Authorization: Bearer $TOKEN"
```

**Connect Ethereum wallet:**
```bash
curl -X POST http://localhost:3000/api/v1/wallets/connect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
    "blockchain": "ethereum",
    "label": "My Wallet"
  }'
```

**Check balance:**
```bash
WALLET_ID="your-wallet-id-here"
curl -X GET "http://localhost:3000/api/v1/wallets/$WALLET_ID/balance" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 Transaction Commands

**Record transaction:**
```bash
curl -X POST http://localhost:3000/api/v1/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "receive",
    "blockchain": "ethereum",
    "amount": "1.0",
    "currency": "ETH",
    "usd_value": 2000,
    "notes": "Payment received"
  }'
```

**View transactions:**
```bash
curl -X GET http://localhost:3000/api/v1/transactions \
  -H "Authorization: Bearer $TOKEN"
```

**Export to CSV:**
```bash
curl -X GET http://localhost:3000/api/v1/transactions/export \
  -H "Authorization: Bearer $TOKEN" > transactions.csv
```

---

## 🛠️ Troubleshooting

**Kill port 3000:**
```bash
lsof -ti :3000 | xargs kill -9
```

**Restart everything:**
```bash
docker-compose down
docker-compose up -d
npm run dev
```

**Run migrations:**
```bash
npm run migrate
```

---

**Always be in:** `~/schnelpay/schnelpay-backend` for npm commands!