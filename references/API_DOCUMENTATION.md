# SchnelPay API Documentation
## Complete API Reference - 19 Endpoints

**Base URL:** `http://localhost:3000`
**Version:** v1
**Authentication:** JWT Bearer Token

---

## 🔐 Authentication

### Register User
**POST** `/api/v1/auth/register`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "created_at": "2026-03-06T..."
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### Login User
**POST** `/api/v1/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    }
  }
}
```

**Token expires in:** 7 days

---

### Get Current User
**GET** `/api/v1/auth/me`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "created_at": "2026-03-06T..."
    }
  }
}
```

---

## 💼 Wallets

### Connect Wallet
**POST** `/api/v1/wallets/connect`

**Headers:**
```
Authorization: Bearer {token}
```

**Request:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
  "blockchain": "ethereum",
  "label": "My Main Wallet"
}
```

**Supported Blockchains:**
- `ethereum` - Ethereum addresses (0x...)
- `bitcoin` - Bitcoin addresses (1..., 3..., bc1...)
- `solana` - Solana addresses (base58, 32-44 chars)

**Response:**
```json
{
  "success": true,
  "data": {
    "wallet": {
      "id": "uuid",
      "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
      "blockchain": "ethereum",
      "label": "My Main Wallet",
      "is_primary": false,
      "created_at": "2026-03-06T..."
    }
  }
}
```

---

### List Wallets
**GET** `/api/v1/wallets`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "wallets": [
      {
        "id": "uuid",
        "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
        "blockchain": "ethereum",
        "label": "My Main Wallet",
        "is_primary": true,
        "created_at": "2026-03-06T..."
      }
    ]
  }
}
```

---

### Get Wallet Balance
**GET** `/api/v1/wallets/:id/balance`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": {
      "balance": "40435000000000000",
      "balanceFormatted": "0.040435 ETH",
      "balanceUSD": 77.86,
      "blockchain": "ethereum",
      "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
      "lastUpdated": "2026-03-06T..."
    }
  }
}
```

**Note:** Cached for 5 minutes

---

### Set Primary Wallet
**PUT** `/api/v1/wallets/:id/primary`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "wallet": {
      "id": "uuid",
      "is_primary": true
    }
  }
}
```

---

### Delete Wallet
**DELETE** `/api/v1/wallets/:id`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Wallet deleted successfully"
  }
}
```

---

## 🪙 Tokens (ERC-20)

### Get Trump Token Balance
**GET** `/api/v1/tokens/trump?wallet={address}`

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `wallet` (required) - Ethereum wallet address

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
      "lastUpdated": "2026-03-06T..."
    }
  }
}
```

---

### Get Any Token Balance
**GET** `/api/v1/tokens/balance?wallet={address}&token={tokenAddress}`

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `wallet` (required) - Ethereum wallet address
- `token` (required) - ERC-20 token contract address

**Example:**
```
GET /api/v1/tokens/balance?wallet=0x742d35Cc...&token=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
```

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": {
      "balance": "1000000",
      "balanceFormatted": "1.000000 USDC",
      "balanceUSD": 1.00,
      "tokenAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "tokenSymbol": "USDC",
      "decimals": 6,
      "lastUpdated": "2026-03-06T..."
    }
  }
}
```

---

### Get Popular Token Balances
**GET** `/api/v1/tokens/popular?wallet={address}`

**Headers:**
```
Authorization: Bearer {token}
```

**Returns balances for:**
- TRUMP
- USDC
- USDT
- DAI
- SHIB
- PEPE

**Response:**
```json
{
  "success": true,
  "data": {
    "balances": [
      {
        "balance": "1000000000000000000000",
        "balanceFormatted": "1000.000000 TRUMP",
        "balanceUSD": 2500.00,
        "tokenSymbol": "TRUMP"
      },
      {
        "balanceFormatted": "500.000000 USDC",
        "balanceUSD": 500.00,
        "tokenSymbol": "USDC"
      }
    ]
  }
}
```

---

### List Known Tokens
**GET** `/api/v1/tokens/list`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tokens": {
      "TRUMP": "0x576e2BeD8F7b46D34016198911Cdf9886f78bea7",
      "USDC": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "USDT": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      "DAI": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      "SHIB": "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE",
      "PEPE": "0x6982508145454Ce325dDbE47a25d4ec3d2311933"
    }
  }
}
```

---

## 📊 Transactions

### Record Transaction
**POST** `/api/v1/transactions`

**Headers:**
```
Authorization: Bearer {token}
```

**Request:**
```json
{
  "wallet_id": "uuid",
  "type": "receive",
  "blockchain": "ethereum",
  "amount": "1.5",
  "currency": "ETH",
  "usd_value": 3000,
  "fee": "0.001",
  "from_address": "0x...",
  "to_address": "0x...",
  "tx_hash": "0x...",
  "notes": "Payment received",
  "metadata": {}
}
```

**Transaction Types:**
- `send` - Outgoing transaction
- `receive` - Incoming transaction
- `trade` - Token swap
- `deposit` - Deposit to exchange
- `withdrawal` - Withdrawal from exchange

**Required Fields:**
- `type`, `blockchain`, `amount`, `currency`

**Optional Fields:**
- `wallet_id`, `usd_value`, `fee`, `from_address`, `to_address`, `tx_hash`, `notes`, `metadata`

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": "uuid",
      "user_id": "uuid",
      "wallet_id": "uuid",
      "type": "receive",
      "blockchain": "ethereum",
      "amount": "1.5",
      "currency": "ETH",
      "usd_value": "3000.00",
      "fee": "0.001",
      "from_address": "0x...",
      "to_address": "0x...",
      "tx_hash": "0x...",
      "status": "completed",
      "notes": "Payment received",
      "metadata": null,
      "created_at": "2026-03-06T..."
    }
  }
}
```

---

### List Transactions
**GET** `/api/v1/transactions?page=1&limit=50`

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 50, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "type": "receive",
        "blockchain": "ethereum",
        "amount": "1.5",
        "currency": "ETH",
        "usd_value": "3000.00",
        "created_at": "2026-03-06T..."
      }
    ],
    "total": 42,
    "page": 1,
    "pages": 1
  }
}
```

---

### Get Single Transaction
**GET** `/api/v1/transactions/:id`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": "uuid",
      "user_id": "uuid",
      "wallet_id": "uuid",
      "type": "receive",
      "blockchain": "ethereum",
      "amount": "1.5",
      "currency": "ETH",
      "usd_value": "3000.00",
      "fee": "0.001",
      "created_at": "2026-03-06T..."
    }
  }
}
```

---

### Export Transactions (CSV)
**GET** `/api/v1/transactions/export`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** CSV file download

**CSV Format:**
```csv
Date,Type,Blockchain,Amount,Currency,USD Value,Fee,From,To,TX Hash,Status,Notes
2026-03-06T...,receive,ethereum,1.5,ETH,3000.00,0.001,0x...,0x...,0x...,completed,Payment received
```

**Use for:**
- Tax filing
- Accounting software import
- Audit trail

---

## 🔧 System

### Health Check
**GET** `/health`

**No authentication required**

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-06T...",
  "service": "SchnelPay API",
  "version": "1.0.0"
}
```

---

### API Info
**GET** `/`

**No authentication required**

**Response:**
```json
{
  "name": "SchnelPay API",
  "version": "1.0.0",
  "description": "Fast payment network for global transactions",
  "endpoints": {
    "health": "/health",
    "api": "/api/v1",
    "auth": "/api/v1/auth",
    "wallets": "/api/v1/wallets",
    "tokens": "/api/v1/tokens",
    "transactions": "/api/v1/transactions"
  }
}
```

---

## ⚠️ Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `404` - Not Found
- `500` - Internal Server Error

**Authentication Errors:**
```json
{
  "success": false,
  "error": "Access token required"
}
```

```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

**Validation Errors:**
```json
{
  "success": false,
  "error": "\"email\" must be a valid email"
}
```

---

## 🔐 Authentication Flow

1. **Register:** `POST /api/v1/auth/register`
2. **Login:** `POST /api/v1/auth/login` → Get token
3. **Use token:** Add `Authorization: Bearer {token}` header to all requests
4. **Token expires in 7 days** → Login again

---

## 💡 Rate Limiting

**Current:** No rate limiting
**Planned:** 100 requests/minute per user

---

## 🌐 External APIs Used

| Service | Purpose | Authentication |
|---------|---------|----------------|
| Infura | Ethereum RPC | API Key |
| Blockchain.com | Bitcoin balance | Public |
| Solana RPC | Solana balance | Public |
| CoinGecko | Crypto prices | Public |

---

## 📝 Notes

- All timestamps in ISO 8601 format (UTC)
- Balances cached for 5 minutes
- Token balances only work for Ethereum addresses
- Transaction export includes all user transactions

---

**Total Endpoints:** 19
**Version:** 1.0.0 (Phase 1 Complete)
**Last Updated:** March 6, 2026
