# SchnelPay - Complete Troubleshooting Guide
## How to Fix Common Errors

**Last Updated:** Day 5 Complete (February 28, 2026)

---

## 🎯 Quick Error Index

Jump to your error:
- [Port 3000 already in use](#error-1-port-3000-already-in-use)
- [Token is empty](#error-2-token-is-empty)
- [Unauthorized / Access token required](#error-3-unauthorized--access-token-required)
- [Connection refused](#error-4-connection-refused)
- [Relation does not exist](#error-5-relation-users-does-not-exist)
- [Cannot find module](#error-6-cannot-find-module)
- [Database connection failed](#error-7-database-connection-failed)
- [Invalid email or password](#error-8-invalid-email-or-password)
- [Wallet already connected](#error-9-wallet-already-connected)
- [Route not found](#error-10-route-not-found)
- [Redis connection error](#error-11-redis-connection-error)
- [TypeScript compilation error](#error-12-typescript-compilation-error)
- [npm ENOENT package.json](#error-13-npm-enoent-packagejson)
- [Docker not running](#error-14-docker-not-running)

---

## Error 1: Port 3000 Already in Use

### **Error Message:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

### **What It Means:**
Another process is using port 3000 (usually an old server you forgot to stop).

### **Solution:**

**Step 1: Kill the process**
```bash
lsof -ti :3000 | xargs kill -9
```

**Step 2: Start server**
```bash
npm run dev
```

### **Prevention:**
Always stop server with `Ctrl + C` when done, don't just close terminal.

---

## Error 2: Token is Empty

### **Error Message:**
```bash
echo "Token: $TOKEN"
Token: 
```
(Shows nothing after "Token:")

### **What It Means:**
The login command failed or didn't extract the token properly.

### **Solution:**

**Step 1: Test login directly**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@schnelpay.com","password":"password123"}'
```

**Step 2: If it returns an error, register new user**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@test.com","password":"password123"}'
```

**Step 3: Copy token from response and set manually**
```bash
TOKEN="paste-your-token-here"
```

### **Common Causes:**
- Wrong email/password
- User doesn't exist
- Server not running
- Database not migrated

---

## Error 3: Unauthorized / Access Token Required

### **Error Message:**
```json
{"success":false,"error":"Unauthorized"}
```
or
```json
{"success":false,"error":"Access token required"}
```

### **What It Means:**
Your token is missing, expired, or invalid.

### **Solution:**

**Step 1: Check if token is set**
```bash
echo "Token: $TOKEN"
```

**Step 2: If empty, get new token**
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)
```

**Step 3: Verify it's set**
```bash
echo "Token: $TOKEN"
```

### **Remember:**
- Tokens expire after 7 days
- Tokens are lost when you close terminal
- Each new terminal needs new token

---

## Error 4: Connection Refused

### **Error Message:**
```
curl: (7) Failed to connect to localhost port 3000 after 0 ms: Couldn't connect to server
```

### **What It Means:**
Server isn't running on port 3000.

### **Solution:**

**Step 1: Check if server is running**
Look at Terminal 1 - do you see:
```
🚀 SchnelPay API Server Started!
```

**Step 2: If not, start it**
```bash
cd ~/schnelpay/schnelpay-backend
npm run dev
```

**Step 3: Wait for startup message**
Don't run commands until you see "Server Started!"

### **Common Causes:**
- Forgot to start server
- Server crashed
- Wrong terminal window
- Port conflict (see Error 1)

---

## Error 5: Relation "users" Does Not Exist

### **Error Message:**
```json
{"success":false,"error":"relation \"users\" does not exist"}
```

### **What It Means:**
Database tables haven't been created yet.

### **Solution:**

**Step 1: Stop server** (Ctrl + C)

**Step 2: Run migrations**
```bash
npm run migrate
```

**Step 3: Should see**
```
Running migrations...
Running migration: 001_create_users_table.sql
✓ Completed: 001_create_users_table.sql
Running migration: 002_create_wallets_table.sql
✓ Completed: 002_create_wallets_table.sql
All migrations completed!
```

**Step 4: Start server**
```bash
npm run dev
```

### **Verification:**
```bash
docker exec -it schnelpay-postgres psql -U schnelpay -d schnelpay_dev
\dt
# Should show: users, wallets, migrations
\q
```

---

## Error 6: Cannot Find Module

### **Error Message:**
```
Error: Cannot find module 'express'
```
or
```
Cannot find module '@types/node'
```

### **What It Means:**
npm dependencies aren't installed.

### **Solution:**

**Step 1: Install dependencies**
```bash
cd ~/schnelpay/schnelpay-backend
npm install
```

**Step 2: Wait for completion**
Should show: `added 586 packages`

**Step 3: Start server**
```bash
npm run dev
```

### **If Still Fails:**
```bash
# Delete and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## Error 7: Database Connection Failed

### **Error Message:**
```
Error: Connection terminated unexpectedly
```
or
```
ECONNREFUSED ::1:5432
```

### **What It Means:**
PostgreSQL isn't running.

### **Solution:**

**Step 1: Check Docker**
```bash
docker ps
```

**Should see:**
```
schnelpay-postgres
schnelpay-redis
```

**Step 2: If not running, start Docker**
```bash
cd ~/schnelpay
docker-compose up -d
```

**Step 3: Verify containers started**
```bash
docker ps
```

**Step 4: Check logs if problems**
```bash
docker logs schnelpay-postgres
```

### **Common Causes:**
- Docker Desktop not running
- Containers stopped
- Wrong database credentials in .env

---

## Error 8: Invalid Email or Password

### **Error Message:**
```json
{"success":false,"error":"Invalid email or password"}
```

### **What It Means:**
User doesn't exist or password is wrong.

### **Solution:**

**Option 1: Check what users exist**
```bash
docker exec -it schnelpay-postgres psql -U schnelpay -d schnelpay_dev
SELECT email FROM users;
\q
```

**Option 2: Register new user**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@test.com","password":"password123"}'
```

**Option 3: Use different email**
Try: `demo@test.com`, `test2@test.com`, etc.

---

## Error 9: Wallet Already Connected

### **Error Message:**
```json
{"success":false,"error":"This wallet is already connected to your account"}
```

### **What It Means:**
You're trying to add a duplicate wallet address.

### **Solution:**

**This is NORMAL!** It's a safety feature.

**To view existing wallets:**
```bash
curl -X GET http://localhost:3000/api/v1/wallets \
  -H "Authorization: Bearer $TOKEN"
```

**To connect different wallet, use different address:**
```bash
# Use a different Ethereum address
curl -X POST http://localhost:3000/api/v1/wallets/connect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "address": "0xAnotherAddressHere",
    "blockchain": "ethereum",
    "label": "My Other Wallet"
  }'
```

---

## Error 10: Route Not Found

### **Error Message:**
```json
{"success":false,"error":"Route not found"}
```

### **What It Means:**
The URL endpoint doesn't exist or has wrong path.

### **Solution:**

**Step 1: Check available routes**
```bash
curl http://localhost:3000/
```

**Step 2: Verify your URL**
Common mistakes:
- ❌ `/wallets/balance` (missing wallet ID)
- ✅ `/wallets/abc-123/balance` (correct)

- ❌ `/api/wallets` (missing version)
- ✅ `/api/v1/wallets` (correct)

**Step 3: Check route order in code**
Sometimes routes conflict. Check `src/routes/wallet.routes.ts`

### **Correct Endpoints:**
```
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/wallets
POST /api/v1/wallets/connect
GET  /api/v1/wallets/:id/balance
PUT  /api/v1/wallets/:id/primary
DELETE /api/v1/wallets/:id
```

---

## Error 11: Redis Connection Error

### **Error Message:**
```
Redis connection error: connect ECONNREFUSED 127.0.0.1:6379
```

### **What It Means:**
Redis isn't running.

### **Solution:**

**Step 1: Check Redis container**
```bash
docker ps | grep redis
```

**Step 2: If not running**
```bash
cd ~/schnelpay
docker-compose up -d
```

**Step 3: Verify Redis**
```bash
docker exec -it schnelpay-redis redis-cli ping
# Should return: PONG
```

**Step 4: Restart server**
```bash
npm run dev
```

---

## Error 12: TypeScript Compilation Error

### **Error Message:**
```
⨯ Unable to compile TypeScript:
src/file.ts(10,3): error TS1128: Declaration or statement expected.
```

### **What It Means:**
Syntax error in your TypeScript code.

### **Solution:**

**Step 1: Read the error carefully**
It tells you:
- File: `src/file.ts`
- Line: `(10,3)` = line 10, column 3
- Error type: What's wrong

**Step 2: Open the file**
```bash
code src/file.ts
```

**Step 3: Go to the line number**
In VS Code: `Cmd + G`, type line number

**Step 4: Common fixes**
- Missing closing brace `}`
- Missing semicolon `;`
- Extra comma `,`
- Unclosed parenthesis `)`
- Unclosed string quote `"`

**Step 5: Save and server will auto-restart**

### **Pro Tip:**
VS Code shows red squiggly lines under errors - hover to see what's wrong!

---

## Error 13: npm ENOENT package.json

### **Error Message:**
```
npm error enoent Could not read package.json
npm error path /Users/you/schnelpay/package.json
```

### **What It Means:**
You're in the wrong folder - no package.json here.

### **Solution:**

**Step 1: Check where you are**
```bash
pwd
```

**Step 2: Should be:**
```
/Users/yourname/schnelpay/schnelpay-backend
```

**Step 3: If not, navigate there**
```bash
cd ~/schnelpay/schnelpay-backend
```

**Step 4: Verify package.json exists**
```bash
ls package.json
```

**Step 5: Now try npm command**
```bash
npm run dev
```

### **Remember:**
- `~/schnelpay/` = parent folder (has docker-compose.yml)
- `~/schnelpay/schnelpay-backend/` = code folder (has package.json)

---

## Error 14: Docker Not Running

### **Error Message:**
```
Cannot connect to the Docker daemon
```

### **What It Means:**
Docker Desktop isn't running.

### **Solution:**

**Step 1: Start Docker Desktop**
- Open Applications
- Double-click "Docker"
- Wait for whale icon in menu bar

**Step 2: Verify Docker is running**
```bash
docker ps
```

**Step 3: Start containers**
```bash
cd ~/schnelpay
docker-compose up -d
```

**Step 4: Verify**
```bash
docker ps
# Should show postgres and redis
```

---

## 🔍 Diagnostic Commands

**Use these to check system status:**

### **Check Server Status**
```bash
# Is port 3000 in use?
lsof -i :3000

# What's running on my Mac?
ps aux | grep node
```

### **Check Docker Status**
```bash
# Are containers running?
docker ps

# View container logs
docker logs schnelpay-postgres
docker logs schnelpay-redis

# Restart containers
docker-compose restart
```

### **Check Database Status**
```bash
# Connect to database
docker exec -it schnelpay-postgres psql -U schnelpay -d schnelpay_dev

# Inside PostgreSQL:
\dt                    # List tables
\d users              # Describe users table
SELECT COUNT(*) FROM users;  # Count users
\q                    # Quit
```

### **Check File Structure**
```bash
# Am I in the right place?
pwd

# What files are here?
ls -la

# Check if key files exist
ls package.json .env src/
```

---

## 🛠️ Complete System Reset

**If everything is broken, start fresh:**

```bash
# 1. Stop everything
docker-compose down
killall node

# 2. Clean up
cd ~/schnelpay/schnelpay-backend
rm -rf node_modules package-lock.json

# 3. Reinstall
npm install

# 4. Start fresh
cd ~/schnelpay
docker-compose up -d

# 5. Run migrations
cd schnelpay-backend
npm run migrate

# 6. Start server
npm run dev
```

---

## 📋 Quick Reference: Common Fix Patterns

| Problem | Quick Fix |
|---------|-----------|
| Server won't start | `lsof -ti :3000 \| xargs kill -9` |
| Database error | `npm run migrate` |
| Token empty | Get new token (see Error 2) |
| Module not found | `npm install` |
| Docker issues | `docker-compose up -d` |
| Can't connect | Check server running in Terminal 1 |
| Wrong folder | `cd ~/schnelpay/schnelpay-backend` |

---

## 🎓 Prevention Tips

### **1. Always Use Two Terminals**
- Terminal 1: Server (`npm run dev`) - keep running
- Terminal 2: Commands (curl, etc.)

### **2. Check Before Running Commands**
```bash
# Are you in the right folder?
pwd

# Is server running? (Terminal 1)
# Is Docker running?
docker ps
```

### **3. Save Your Work**
```bash
git add .
git commit -m "Working state"
git push origin main
```

### **4. Keep Variables Fresh**
Variables disappear when terminal closes:
```bash
# Save these after opening new terminal
TOKEN="your-token"
WALLET_ID="your-wallet-id"
```

---

## 🆘 When to Ask for Help

**Try these first:**
1. Read error message carefully
2. Check this guide
3. Run diagnostic commands
4. Try system reset

**Ask for help if:**
- Error not in this guide
- Solution doesn't work
- You've tried reset and still broken
- You broke something new

**When asking:**
- Copy full error message
- Show what command you ran
- Share output of `pwd`, `docker ps`, `lsof -i :3000`

---

## ✅ Daily Startup Checklist

**Every time you start working:**

```bash
# 1. Start Docker
docker-compose up -d

# 2. Verify Docker
docker ps  # Should show 2 containers

# 3. Navigate to backend
cd ~/schnelpay/schnelpay-backend

# 4. Start server (Terminal 1)
npm run dev

# 5. Wait for "Server Started!"

# 6. New terminal (Terminal 2)
cd ~/schnelpay/schnelpay-backend

# 7. Get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpass"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# 8. Verify
echo "Token: $TOKEN"

# 9. Ready to work! 🚀
```

---

## 💡 Pro Tips

### **Tip 1: Create Startup Script**
Save as `~/schnelpay/start.sh`:
```bash
#!/bin/bash
cd ~/schnelpay
docker-compose up -d
cd schnelpay-backend
npm run dev
```

### **Tip 2: Create Aliases**
Add to `~/.bash_profile`:
```bash
alias schnelpay-start='cd ~/schnelpay/schnelpay-backend && npm run dev'
alias schnelpay-token='TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login -H "Content-Type: application/json" -d "{\"email\":\"your@email.com\",\"password\":\"yourpass\"}" | grep -o "\"token\":\"[^\"]*" | cut -d"\"" -f4)'
```

### **Tip 3: Keep a Testing User**
Always have one user for testing:
- Email: `test@test.com`
- Password: `password123`
- Never delete this user

---

**Keep this guide handy! You'll reference it often.** 📚🔧

**Most errors are simple - just need to know where to look!** 💪
