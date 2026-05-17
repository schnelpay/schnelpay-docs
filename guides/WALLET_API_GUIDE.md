# SchnelPay API - Complete Wallet Access Guide
## How to Get and Use Wallet Information

**Last Updated:** Day 5 Complete (February 26, 2026)

---

## 🎯 What This Guide Teaches

By the end, you'll know how to:
- ✅ Start your API server
- ✅ Login and get authentication token
- ✅ View all your wallets
- ✅ Check wallet balances
- ✅ Use terminal variables to save typing
- ✅ Troubleshoot common issues

---

## 📋 Prerequisites

Before starting, make sure:
- ✅ Docker is running (`docker ps` shows postgres + redis)
- ✅ You're in the backend folder: `cd ~/schnelpay/schnelpay-backend`
- ✅ You have 2 terminal windows open

---

## 🚀 Step-by-Step Guide

### **Step 1: Start Your Server**

**Terminal Window 1:**

```bash
# Navigate to backend
cd ~/schnelpay/schnelpay-backend

# Start server
npm run dev
```

**Wait for this message:**
```
🚀 SchnelPay API Server Started!
================================
✓ Server: http://localhost:3000
✓ Environment: development
✓ API Version: v1
================================
```

**✅ Server is now running!** Keep this terminal window open.

---

### **Step 2: Open Second Terminal for Commands**

**Terminal Window 2:**

Press `Cmd + N` to open a new terminal window.

```bash
# Navigate to backend folder
cd ~/schnelpay/schnelpay-backend
```

**From now on, all commands run in Terminal 2.**

---

### **Step 3: Login and Get Your Token**

**What is a token?**
- A token is like a temporary password that proves you're logged in
- It expires after 7 days
- You need it for every API request

**Get your token:**

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@schnelpay.com","password":"password123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)
```

**What this command does:**
1. Sends login request to your API
2. Extracts just the token from the response
3. Saves it to a variable called `TOKEN`

**Verify it worked:**

```bash
echo "Token: $TOKEN"
```

**You should see:**
```
Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQ...
```

**✅ If you see a long string = Success!**

**❌ If it's empty:**
- Check server is running (Terminal 1)
- Check you used the correct email/password
- Try the command again

---

### **Step 4: View All Your Wallets**

**Simple view (all info):**

```bash
curl -X GET http://localhost:3000/api/v1/wallets \
  -H "Authorization: Bearer $TOKEN"
```

**You'll see JSON like:**

```json
{
  "success": true,
  "data": {
    "wallets": [
      {
        "id": "dd076c5f-7c25-483d-8a39-c809f66ae854",
        "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
        "blockchain": "ethereum",
        "label": "My Main Wallet",
        "is_primary": true,
        "created_at": "2026-02-24T11:56:35.534Z"
      },
      {
        "id": "8ec80462-d551-43a7-bfbe-3dd12fc1aa9d",
        "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        "blockchain": "bitcoin",
        "label": "Bitcoin Savings",
        "is_primary": false,
        "created_at": "2026-02-25T12:24:41.824Z"
      }
    ]
  }
}
```

---

### **Step 5: Save a Wallet ID to Use It**

**What is a Wallet ID?**
- Every wallet has a unique ID (UUID)
- Looks like: `dd076c5f-7c25-483d-8a39-c809f66ae854`
- You need this ID to check balance, delete wallet, etc.

**Method A: Automatically save the first wallet ID:**

```bash
WALLET_ID=$(curl -s -X GET http://localhost:3000/api/v1/wallets \
  -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
```

**Verify it worked:**

```bash
echo "Wallet ID: $WALLET_ID"
```

**Should show:**
```
Wallet ID: dd076c5f-7c25-483d-8a39-c809f66ae854
```

**Method B: Save a specific wallet ID manually:**

1. View all wallets (Step 4)
2. Find the wallet you want
3. Copy its ID
4. Save to variable:

```bash
WALLET_ID="paste-the-id-here"
```

**Example:**
```bash
WALLET_ID="dd076c5f-7c25-483d-8a39-c809f66ae854"
```

---

### **Step 6: Check Wallet Balance**

**Once you have TOKEN and WALLET_ID saved:**

```bash
curl -X GET "http://localhost:3000/api/v1/wallets/$WALLET_ID/balance" \
  -H "Authorization: Bearer $TOKEN"
```

**Response example:**

```json
{
  "success": true,
  "data": {
    "balance": {
      "balance": "40435150000000000",
      "balanceFormatted": "0.040435 ETH",
      "balanceUSD": 82.57,
      "blockchain": "ethereum",
      "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
      "lastUpdated": "2026-02-26T02:14:49.283Z"
    }
  }
}
```

**What you're seeing:**
- `balance`: Raw balance in smallest unit (Wei for Ethereum)
- `balanceFormatted`: Human-readable (ETH, BTC, etc.)
- `balanceUSD`: Current value in US dollars
- `lastUpdated`: When this was fetched (cached for 5 min)

---

## 🎓 Understanding Terminal Variables

### **What are variables?**

Variables let you save information to reuse it.

**Example:**
```bash
# Save your name
NAME="John"

# Use it later
echo "Hello $NAME"
# Outputs: Hello John
```

**In our API:**
```bash
# Save token
TOKEN="eyJhbGci..."

# Use it in requests
curl ... -H "Authorization: Bearer $TOKEN"
```

---

### **Why use variables?**

**Without variables (painful):**
```bash
curl ... -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlM2YwYmJkYS1mMDcyLTRjMTUtOGE3YS1jOGNjMGM5ZjRlYmYiLCJpYXQiOjE3NzIwNzE4MzUsImV4cCI6MTc3MjY3NjYzNX0.ohEvk3OqbvhZw61RHGngghXdOraT9sv7YBAiau-iwPU"
```

**With variables (easy):**
```bash
curl ... -H "Authorization: Bearer $TOKEN"
```

**Much cleaner!** ✅

---

### **Important: Variables are temporary**

Variables only exist in the current terminal session.

**If you close Terminal 2:**
- ❌ `$TOKEN` is gone
- ❌ `$WALLET_ID` is gone

**When you open a new terminal:**
- You need to set them again
- Just run Steps 3-5 again

---

## 📋 Complete Workflow (Copy-Paste Ready)

**Here's the complete workflow in one place:**

```bash
# 1. Start server (Terminal 1)
cd ~/schnelpay/schnelpay-backend
npm run dev

# 2. In new terminal (Terminal 2)
cd ~/schnelpay/schnelpay-backend

# 3. Login and get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@schnelpay.com","password":"password123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# 4. Verify token
echo "Token: $TOKEN"

# 5. Get first wallet ID
WALLET_ID=$(curl -s -X GET http://localhost:3000/api/v1/wallets \
  -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

# 6. Verify wallet ID
echo "Wallet ID: $WALLET_ID"

# 7. Check balance
curl -X GET "http://localhost:3000/api/v1/wallets/$WALLET_ID/balance" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔍 All Available Wallet Operations

### **1. View All Wallets**

```bash
curl -X GET http://localhost:3000/api/v1/wallets \
  -H "Authorization: Bearer $TOKEN"
```

---

### **2. Connect New Wallet**

**Ethereum:**
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

**Bitcoin:**
```bash
curl -X POST http://localhost:3000/api/v1/wallets/connect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "blockchain": "bitcoin",
    "label": "Bitcoin Savings"
  }'
```

**Solana:**
```bash
curl -X POST http://localhost:3000/api/v1/wallets/connect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "address": "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK",
    "blockchain": "solana",
    "label": "Solana Wallet"
  }'
```

---

### **3. Check Balance**

```bash
curl -X GET "http://localhost:3000/api/v1/wallets/$WALLET_ID/balance" \
  -H "Authorization: Bearer $TOKEN"
```

---

### **4. Set Wallet as Primary**

```bash
curl -X PUT "http://localhost:3000/api/v1/wallets/$WALLET_ID/primary" \
  -H "Authorization: Bearer $TOKEN"
```

---

### **5. Delete Wallet**

```bash
curl -X DELETE "http://localhost:3000/api/v1/wallets/$WALLET_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🛠️ Working with Multiple Wallets

### **Save Multiple Wallet IDs**

```bash
# Get all wallets
curl -X GET http://localhost:3000/api/v1/wallets \
  -H "Authorization: Bearer $TOKEN"

# Manually save each wallet ID
ETH_WALLET="dd076c5f-7c25-483d-8a39-c809f66ae854"
BTC_WALLET="8ec80462-d551-43a7-bfbe-3dd12fc1aa9d"

# Check balances
curl -X GET "http://localhost:3000/api/v1/wallets/$ETH_WALLET/balance" \
  -H "Authorization: Bearer $TOKEN"

curl -X GET "http://localhost:3000/api/v1/wallets/$BTC_WALLET/balance" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🐛 Troubleshooting

### **Problem: "Token: " (empty)**

**Cause:** Login failed

**Solutions:**
1. Check server is running in Terminal 1
2. Verify email/password are correct:
   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@schnelpay.com","password":"password123"}'
   ```
3. If error, register a new user:
   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"newuser@test.com","password":"password123"}'
   ```

---

### **Problem: "Wallet ID: " (empty)**

**Cause:** No wallets connected yet

**Solution:** Connect a wallet first:
```bash
curl -X POST http://localhost:3000/api/v1/wallets/connect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
    "blockchain": "ethereum",
    "label": "Test Wallet"
  }'
```

---

### **Problem: "Unauthorized"**

**Causes:**
1. Token expired (7 days)
2. Token variable not set

**Solution:** Get new token:
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@schnelpay.com","password":"password123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)
```

---

### **Problem: "Connection refused"**

**Cause:** Server not running

**Solution:**
1. Go to Terminal 1
2. Check if server crashed
3. Restart: `npm run dev`

---

### **Problem: Port 3000 already in use**

**Solution:**
```bash
# Kill process using port 3000
lsof -ti :3000 | xargs kill -9

# Start server again
npm run dev
```

---

## 📊 Quick Reference Card

### **Essential Commands**

| Task | Command |
|------|---------|
| Start server | `cd ~/schnelpay/schnelpay-backend && npm run dev` |
| Get token | `TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"test@schnelpay.com","password":"password123"}' \| grep -o '"token":"[^"]*' \| cut -d'"' -f4)` |
| View wallets | `curl -X GET http://localhost:3000/api/v1/wallets -H "Authorization: Bearer $TOKEN"` |
| Get wallet ID | `WALLET_ID=$(curl -s -X GET http://localhost:3000/api/v1/wallets -H "Authorization: Bearer $TOKEN" \| grep -o '"id":"[^"]*' \| head -1 \| cut -d'"' -f4)` |
| Check balance | `curl -X GET "http://localhost:3000/api/v1/wallets/$WALLET_ID/balance" -H "Authorization: Bearer $TOKEN"` |

---

### **Variables You'll Use**

| Variable | What It Stores | How to Set |
|----------|----------------|------------|
| `$TOKEN` | Authentication token | Login command |
| `$WALLET_ID` | Wallet UUID | Get from wallets list |
| `$ETH_WALLET` | Ethereum wallet ID | Copy manually |
| `$BTC_WALLET` | Bitcoin wallet ID | Copy manually |

---

## 💡 Pro Tips

### **Tip 1: Create a Setup Script**

Save this as `~/schnelpay/setup.sh`:

```bash
#!/bin/bash
cd ~/schnelpay/schnelpay-backend

echo "Getting token..."
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@schnelpay.com","password":"password123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "Getting wallet ID..."
WALLET_ID=$(curl -s -X GET http://localhost:3000/api/v1/wallets \
  -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

echo "✅ Ready!"
echo "Token: $TOKEN"
echo "Wallet: $WALLET_ID"
echo ""
echo "You can now run:"
echo "  curl -X GET \"http://localhost:3000/api/v1/wallets/\$WALLET_ID/balance\" -H \"Authorization: Bearer \$TOKEN\""
```

**Make it executable:**
```bash
chmod +x ~/schnelpay/setup.sh
```

**Use it:**
```bash
source ~/schnelpay/setup.sh
```

---

### **Tip 2: Check Token Expiration**

Tokens expire after 7 days. Check when yours expires:

```bash
# Decode token (requires jq - install with: brew install jq)
echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .exp
```

---

### **Tip 3: Pretty Print JSON**

Make responses easier to read:

```bash
# Install jq
brew install jq

# Use it to format JSON
curl ... | jq .
```

---

## 🎯 Practice Exercises

### **Exercise 1: Complete Workflow**

Try this from scratch:
1. Start server
2. Get token
3. Get wallet ID
4. Check balance
5. Connect a new wallet
6. Check both balances

---

### **Exercise 2: Multiple Users**

1. Register a second user
2. Login as that user
3. Connect different wallets
4. Switch between users

---

### **Exercise 3: Error Handling**

Try to trigger each error:
1. Use expired token
2. Use wrong wallet ID
3. Try to access another user's wallet

---

## 📚 Next Steps

Now that you know how to access wallet information, learn:
- **Payment Processing** - Initiate transactions
- **Transaction History** - View past transactions
- **WebSocket Integration** - Real-time balance updates
- **Frontend Integration** - Build a UI for your API

---

## ✅ Summary

**You learned:**
- ✅ How to start your server
- ✅ How to get authentication tokens
- ✅ How to view all wallets
- ✅ How to save wallet IDs
- ✅ How to check balances
- ✅ How terminal variables work
- ✅ How to troubleshoot common issues

**Keep this guide handy!** You'll use these commands constantly as you develop.

---

**Your API Endpoints:**
```
http://localhost:3000/health
http://localhost:3000/api/v1/auth/register
http://localhost:3000/api/v1/auth/login
http://localhost:3000/api/v1/wallets
http://localhost:3000/api/v1/wallets/:id/balance
http://localhost:3000/api/v1/wallets/connect
http://localhost:3000/api/v1/wallets/:id/primary
http://localhost:3000/api/v1/wallets/:id
```

**Happy coding!** 🚀
