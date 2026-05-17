# SchnelPay - Key Code Snippets
## Important Patterns & Examples

---

## 🔐 Authentication Patterns

### JWT Token Generation
```typescript
// src/services/auth.service.ts
import jwt from 'jsonwebtoken';
import { config } from '../config';

const token = jwt.sign(
  { userId: user.id },
  config.jwt.secret,
  { expiresIn: config.jwt.expiresIn } // '7d'
);
```

### Password Hashing
```typescript
import bcrypt from 'bcrypt';

// Hash password
const passwordHash = await bcrypt.hash(password, 10);

// Verify password
const isValid = await bcrypt.compare(password, user.password_hash);
```

### Auth Middleware
```typescript
// src/middleware/auth.middleware.ts
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Access token required' 
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    (req as any).user = { id: decoded.userId };
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid token' 
    });
  }
};
```

---

## 💾 Database Patterns

### PostgreSQL Query
```typescript
import { pool } from '../database';

const result = await pool.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

const user = result.rows[0];
```

### Transaction with Error Handling
```typescript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  
  // Your queries here
  await client.query('INSERT INTO ...');
  await client.query('UPDATE ...');
  
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

---

## 🗄️ Redis Caching

### Cache Data
```typescript
// src/database/redis.ts
import Redis from 'ioredis';

export const redis = new Redis(config.redis.url);

export async function cacheData(
  key: string,
  data: any,
  expirationSeconds = 300
): Promise<void> {
  await redis.setex(
    key, 
    expirationSeconds, 
    JSON.stringify(data)
  );
}

export async function getCachedData(key: string): Promise<any | null> {
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}
```

### Usage Example
```typescript
const cacheKey = `balance:${blockchain}:${address}`;

// Try cache first
const cached = await getCachedData(cacheKey);
if (cached) return cached;

// Fetch from API
const balance = await fetchFromBlockchain();

// Cache result
await cacheData(cacheKey, balance, 300); // 5 min
```

---

## 🔗 Blockchain Integration

### Ethereum Balance (Infura)
```typescript
const response = await axios.post(
  `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
  {
    jsonrpc: '2.0',
    method: 'eth_getBalance',
    params: [address, 'latest'],
    id: 1,
  }
);

const balanceHex = response.data.result;
const balanceWei = parseInt(balanceHex, 16);
const balanceEth = balanceWei / 1e18;
```

### Bitcoin Balance
```typescript
const response = await axios.get(
  `https://blockchain.info/q/addressbalance/${address}`
);

const balanceSatoshi = parseInt(response.data);
const balanceBTC = balanceSatoshi / 1e8;
```

### Solana Balance
```typescript
const response = await axios.post(
  'https://api.mainnet-beta.solana.com',
  {
    jsonrpc: '2.0',
    id: 1,
    method: 'getBalance',
    params: [address],
  }
);

const balanceLamports = response.data.result.value;
const balanceSOL = balanceLamports / 1e9;
```

---

## 🪙 ERC-20 Token Pattern

### Token Balance Check
```typescript
import { ethers } from 'ethers';

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

const provider = new ethers.providers.JsonRpcProvider(
  `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`
);

const contract = new ethers.Contract(
  tokenAddress, 
  ERC20_ABI, 
  provider
);

const [balance, decimals, symbol] = await Promise.all([
  contract.balanceOf(walletAddress),
  contract.decimals(),
  contract.symbol(),
]);

const balanceFormatted = ethers.utils.formatUnits(balance, decimals);
```

---

## 📊 Input Validation (Joi)

### Request Validation
```typescript
import Joi from 'joi';

const createWalletSchema = Joi.object({
  address: Joi.string().required(),
  blockchain: Joi.string()
    .valid('ethereum', 'bitcoin', 'solana')
    .required(),
  label: Joi.string().max(100).optional(),
});

const { error, value } = createWalletSchema.validate(req.body);

if (error) {
  return res.status(400).json({
    success: false,
    error: error.details[0].message,
  });
}
```

---

## 🎯 Controller Pattern

### Standard Controller Structure
```typescript
export class WalletController {
  static async createWallet(req: Request, res: Response) {
    try {
      // 1. Get user from auth
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          error: 'Unauthorized' 
        });
      }

      // 2. Validate input
      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({ 
          success: false, 
          error: error.details[0].message 
        });
      }

      // 3. Call service
      const wallet = await WalletService.create({
        userId,
        ...value,
      });

      // 4. Return success
      return res.status(201).json({
        success: true,
        data: { wallet },
      });
    } catch (error: any) {
      console.error('Create wallet error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create wallet',
      });
    }
  }
}
```

---

## 🛣️ Route Pattern

### Standard Route Structure
```typescript
import { Router } from 'express';
import { WalletController } from '../controllers/wallet.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Apply auth to all routes
router.use(authenticateToken);

// Define routes
router.post('/connect', WalletController.createWallet);
router.get('/', WalletController.getWallets);
router.get('/:id/balance', WalletController.getBalance);
router.put('/:id/primary', WalletController.setPrimary);
router.delete('/:id', WalletController.deleteWallet);

export default router;
```

---

## 📝 Database Migration Pattern

### Migration File Structure
```sql
-- migrations/003_create_transactions_table.sql

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id 
  ON transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at 
  ON transactions(created_at DESC);
```

### Running Migrations
```typescript
// src/database/migrate.ts
import fs from 'fs';
import path from 'path';
import { pool } from './index';

export async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(
      path.join(migrationsDir, file), 
      'utf8'
    );
    
    await pool.query(sql);
    console.log(`✓ Completed: ${file}`);
  }
}
```

---

## 🔄 CSV Export Pattern

### Generate CSV
```typescript
static async exportToCSV(userId: string): Promise<string> {
  const transactions = await TransactionModel.findByUserId(
    userId, 
    10000, 
    0
  );

  const headers = [
    'Date',
    'Type',
    'Amount',
    'Currency',
    'USD Value',
  ];

  const rows = transactions.map((tx) => [
    new Date(tx.created_at).toISOString(),
    tx.type,
    tx.amount,
    tx.currency,
    tx.usd_value || '',
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n');

  return csv;
}
```

### Serve CSV Download
```typescript
static async exportCSV(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  const csv = await TransactionService.exportToCSV(userId);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition', 
    'attachment; filename=transactions.csv'
  );
  
  return res.status(200).send(csv);
}
```

---

## ⚙️ Environment Configuration

### Config Pattern
```typescript
// src/config/index.ts
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000'),
  
  database: {
    url: process.env.DATABASE_URL!,
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  blockchain: {
    infuraProjectId: process.env.INFURA_PROJECT_ID!,
    ethereumNetwork: process.env.ETHEREUM_NETWORK || 'mainnet',
    exchangeRateApi: process.env.EXCHANGE_RATE_API!,
  },
  
  api: {
    version: process.env.API_VERSION || 'v1',
  },
};
```

---

## 🚀 Server Startup

### Server Entry Point
```typescript
// src/server.ts
import app from './app';
import { pool } from './database';
import { redis } from './database/redis';
import { config } from './config';

async function startServer() {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✓ Connected to PostgreSQL database');
    
    // Test Redis connection
    await redis.ping();
    console.log('✓ Connected to Redis');
    
    // Start server
    app.listen(config.port, () => {
      console.log(`
🚀 SchnelPay API Server Started!
================================
✓ Server: http://localhost:${config.port}
✓ Environment: ${config.env}
✓ API Version: ${config.api.version}
================================
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
```

---

## 🧪 Testing Patterns

### cURL Test Examples
```bash
# Login and save token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Use token
curl -X GET http://localhost:3000/api/v1/wallets \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎨 Response Format Standards

### Success Response
```typescript
{
  success: true,
  data: {
    // Your data here
  }
}
```

### Error Response
```typescript
{
  success: false,
  error: "Error message"
}
```

### Paginated Response
```typescript
{
  success: true,
  data: {
    items: [...],
    total: 100,
    page: 1,
    pages: 10
  }
}
```

---

**These are the core patterns used throughout SchnelPay!** 🎯
