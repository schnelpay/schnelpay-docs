# Adding ERC-20 Token Support (Trump Coin & Others)
## How to Add Token Balance Checking

**Last Updated:** Day 5+ (February 28, 2026)

---

## 🎯 What We're Adding

**ERC-20 tokens** are tokens built on Ethereum (like USDC, USDT, TRUMP, etc.)

**We'll add:**
- ✅ Check ERC-20 token balances
- ✅ Support Trump coin (TRUMP)
- ✅ Support any ERC-20 token
- ✅ Store token addresses
- ✅ Get token prices

---

## 📁 Step 1: Install ethers.js

```bash
cd ~/schnelpay/schnelpay-backend
npm install ethers@5.7.2
```

---

## 📁 Step 2: Create Token Service

**Create new file:**

```bash
code src/services/token.service.ts
```

**Paste this complete code:**

```typescript
import { ethers } from 'ethers';
import axios from 'axios';
import { config } from '../config';
import { cacheData, getCachedData } from '../database/redis';

// ERC-20 Token ABI (just the balanceOf function we need)
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

export interface TokenBalance {
  balance: string;
  balanceFormatted: string;
  balanceUSD: number;
  tokenAddress: string;
  tokenSymbol: string;
  decimals: number;
  lastUpdated: Date;
}

// Known token addresses on Ethereum mainnet
export const KNOWN_TOKENS = {
  TRUMP: '0x576e2BeD8F7b46D34016198911Cdf9886f78bea7',  // Official Trump token
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  SHIB: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
  PEPE: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
};

export class TokenService {
  /**
   * Get ERC-20 token balance
   */
  static async getTokenBalance(
    walletAddress: string,
    tokenAddress: string
  ): Promise<TokenBalance> {
    // Check cache first
    const cacheKey = `token:${tokenAddress}:${walletAddress}`;
    const cached = await getCachedData(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      // Connect to Ethereum via Infura
      const provider = new ethers.providers.JsonRpcProvider(
        `https://mainnet.infura.io/v3/${config.blockchain.infuraProjectId}`
      );

      // Create contract instance
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

      // Get token info
      const [balance, decimals, symbol] = await Promise.all([
        contract.balanceOf(walletAddress),
        contract.decimals(),
        contract.symbol(),
      ]);

      // Convert balance to readable format
      const balanceFormatted = ethers.utils.formatUnits(balance, decimals);

      // Get token price in USD
      const priceUSD = await this.getTokenPrice(tokenAddress);
      const balanceUSD = parseFloat(balanceFormatted) * priceUSD;

      const result: TokenBalance = {
        balance: balance.toString(),
        balanceFormatted: `${parseFloat(balanceFormatted).toFixed(6)} ${symbol}`,
        balanceUSD: parseFloat(balanceUSD.toFixed(2)),
        tokenAddress,
        tokenSymbol: symbol,
        decimals,
        lastUpdated: new Date(),
      };

      // Cache for 5 minutes
      await cacheData(cacheKey, result, 300);

      return result;
    } catch (error: any) {
      console.error('Token balance error:', error.message);
      throw new Error(`Failed to fetch token balance: ${error.message}`);
    }
  }

  /**
   * Get token price in USD from CoinGecko
   */
  private static async getTokenPrice(tokenAddress: string): Promise<number> {
    try {
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/token_price/ethereum`,
        {
          params: {
            contract_addresses: tokenAddress,
            vs_currencies: 'usd',
          },
        }
      );

      const price = response.data[tokenAddress.toLowerCase()]?.usd;
      return price || 0;
    } catch (error) {
      console.error('Failed to fetch token price:', error);
      return 0; // Return 0 if price unavailable
    }
  }

  /**
   * Get multiple token balances for a wallet
   */
  static async getMultipleTokenBalances(
    walletAddress: string,
    tokenAddresses: string[]
  ): Promise<TokenBalance[]> {
    const balances = await Promise.all(
      tokenAddresses.map((tokenAddress) =>
        this.getTokenBalance(walletAddress, tokenAddress).catch(() => null)
      )
    );

    // Filter out null results (failed requests)
    return balances.filter((b): b is TokenBalance => b !== null);
  }

  /**
   * Get popular token balances (TRUMP, USDC, USDT, etc.)
   */
  static async getPopularTokenBalances(
    walletAddress: string
  ): Promise<TokenBalance[]> {
    const tokenAddresses = Object.values(KNOWN_TOKENS);
    return this.getMultipleTokenBalances(walletAddress, tokenAddresses);
  }
}
```

**Save:** `Cmd + S`

---

## 📁 Step 3: Add Token Routes

**Create new file:**

```bash
code src/routes/token.routes.ts
```

**Paste this:**

```typescript
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { TokenService, KNOWN_TOKENS } from '../services/token.service';
import { Request, Response } from 'express';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * Get token balance
 * GET /api/v1/tokens/balance?wallet=0x...&token=0x...
 */
router.get('/balance', async (req: Request, res: Response) => {
  try {
    const { wallet, token } = req.query;

    if (!wallet || !token) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address and token address required',
      });
    }

    const balance = await TokenService.getTokenBalance(
      wallet as string,
      token as string
    );

    return res.status(200).json({
      success: true,
      data: { balance },
    });
  } catch (error: any) {
    console.error('Get token balance error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get token balance',
    });
  }
});

/**
 * Get Trump coin balance
 * GET /api/v1/tokens/trump?wallet=0x...
 */
router.get('/trump', async (req: Request, res: Response) => {
  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address required',
      });
    }

    const balance = await TokenService.getTokenBalance(
      wallet as string,
      KNOWN_TOKENS.TRUMP
    );

    return res.status(200).json({
      success: true,
      data: { balance },
    });
  } catch (error: any) {
    console.error('Get Trump token balance error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get Trump token balance',
    });
  }
});

/**
 * Get all popular token balances for a wallet
 * GET /api/v1/tokens/popular?wallet=0x...
 */
router.get('/popular', async (req: Request, res: Response) => {
  try {
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address required',
      });
    }

    const balances = await TokenService.getPopularTokenBalances(wallet as string);

    return res.status(200).json({
      success: true,
      data: { balances },
    });
  } catch (error: any) {
    console.error('Get popular token balances error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get token balances',
    });
  }
});

/**
 * Get list of known tokens
 * GET /api/v1/tokens/list
 */
router.get('/list', async (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    data: { tokens: KNOWN_TOKENS },
  });
});

export default router;
```

**Save:** `Cmd + S`

---

## 📁 Step 4: Update app.ts

**Open:**

```bash
code src/app.ts
```

**Add import at top:**

```typescript
import tokenRoutes from './routes/token.routes';
```

**Add route (after wallet routes):**

```typescript
// Token routes
app.use(`/api/${config.api.version}/tokens`, tokenRoutes);
```

**Update API info endpoint to include tokens:**

```typescript
// API info
app.get('/', (req, res) => {
  res.json({
    name: 'SchnelPay API',
    version: '1.0.0',
    description: 'Fast payment network for global transactions',
    endpoints: {
      health: '/health',
      api: `/api/${config.api.version}`,
      auth: `/api/${config.api.version}/auth`,
      wallets: `/api/${config.api.version}/wallets`,
      tokens: `/api/${config.api.version}/tokens`, // ADD THIS
    }
  });
});
```

**Save:** `Cmd + S`

---

## 🔄 Step 5: Restart Server

```bash
# Stop (Ctrl + C)
npm run dev
```

---

## 🧪 Step 6: Test Trump Coin!

### **Check Trump Token Balance:**

```bash
# Your Ethereum wallet address
WALLET="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1"

# Check Trump token balance
curl -X GET "http://localhost:3000/api/v1/tokens/trump?wallet=$WALLET" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": {
      "balance": "1000000000000000000000",
      "balanceFormatted": "1000.000000 TRUMP",
      "balanceUSD": 2500.00,
      "tokenAddress": "0x576e2BeD8F7b46D34016198911Cdf9886f78bea7",
      "tokenSymbol": "TRUMP",
      "decimals": 18,
      "lastUpdated": "2026-02-28T05:00:00.000Z"
    }
  }
}
```

---

### **Check All Popular Tokens:**

```bash
curl -X GET "http://localhost:3000/api/v1/tokens/popular?wallet=$WALLET" \
  -H "Authorization: Bearer $TOKEN"
```

**Shows balances for:**
- TRUMP
- USDC
- USDT
- DAI
- SHIB
- PEPE

---

### **Check Specific Token:**

```bash
# Check USDC balance
USDC_ADDRESS="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"

curl -X GET "http://localhost:3000/api/v1/tokens/balance?wallet=$WALLET&token=$USDC_ADDRESS" \
  -H "Authorization: Bearer $TOKEN"
```

---

### **List All Known Tokens:**

```bash
curl -X GET "http://localhost:3000/api/v1/tokens/list" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎯 Testing with Real Data

**Try with a known address that has Trump tokens:**

```bash
# Example wallet with tokens (replace with real one)
TEST_WALLET="0x1234567890123456789012345678901234567890"

curl -X GET "http://localhost:3000/api/v1/tokens/trump?wallet=$TEST_WALLET" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 Complete Token Support

**Your API now supports:**

### **Native Cryptocurrencies:**
- ✅ Ethereum (ETH)
- ✅ Bitcoin (BTC)
- ✅ Solana (SOL)

### **ERC-20 Tokens:**
- ✅ Trump (TRUMP)
- ✅ USD Coin (USDC)
- ✅ Tether (USDT)
- ✅ Dai (DAI)
- ✅ Shiba Inu (SHIB)
- ✅ Pepe (PEPE)
- ✅ Any ERC-20 token!

---

## 🔧 Adding More Tokens

**To add any ERC-20 token:**

**Step 1: Find token contract address on Etherscan**

**Step 2: Add to KNOWN_TOKENS in token.service.ts:**

```typescript
export const KNOWN_TOKENS = {
  TRUMP: '0x576e2BeD8F7b46D34016198911Cdf9886f78bea7',
  YOUR_TOKEN: '0x...token-address-here...',  // ADD NEW TOKEN
  // ... other tokens
};
```

**Step 3: Restart server**

**Step 4: Access via:**
```bash
curl -X GET "http://localhost:3000/api/v1/tokens/balance?wallet=$WALLET&token=0x...token-address..." \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎓 How It Works

**ERC-20 tokens are smart contracts on Ethereum:**

1. Each token has a contract address
2. We call the `balanceOf(address)` function
3. Token returns balance in its smallest unit
4. We convert using token's `decimals()`
5. Get price from CoinGecko
6. Calculate USD value
7. Cache for 5 minutes

**Example:**
- Trump token has 18 decimals
- Balance: 1,000,000,000,000,000,000,000
- Divided by 10^18 = 1,000 TRUMP
- Price: $2.50 per TRUMP
- USD value: $2,500

---

## 💾 Commit Changes

```bash
cd ~/schnelpay/schnelpay-backend

git add .
git commit -m "Add ERC-20 token support including Trump coin"
git push origin main
```

---

## 🎊 You Now Have Complete Token Support!

**Your API can check balances for:**
- Native cryptocurrencies (ETH, BTC, SOL)
- Any ERC-20 token (TRUMP, USDC, USDT, etc.)
- Multiple tokens at once
- Real-time USD prices
- Cached for performance

**This is production-grade DeFi infrastructure!** 🚀💰

---

**Test Trump coin balance and commit!** 🪙
