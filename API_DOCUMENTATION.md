# Morphing QR Code API Documentation

**Version:** 1.0.0  
**Base URL:** `https://your-domain.com/api/v1`  
**Authentication:** API Key (Header: `X-API-Key` or `Authorization: Bearer <API_KEY>`)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Rate Limiting](#rate-limiting)
3. [Endpoints](#endpoints)
   - [Chains](#chains)
   - [Scans](#scans)
   - [Statistics](#statistics)
4. [Webhooks](#webhooks)
5. [Error Handling](#error-handling)
6. [Code Examples](#code-examples)

---

## Authentication

All API requests require authentication using an API key. You can generate an API key from your organization settings dashboard.

### Headers

```http
X-API-Key: your_api_key_here
```

Or alternatively:

```http
Authorization: Bearer your_api_key_here
```

---

## Rate Limiting

Rate limits are enforced based on your subscription plan:

| Plan | Requests per Hour |
|------|-------------------|
| Free | 100 |
| Starter | 1,000 |
| Professional | 10,000 |
| Enterprise | 100,000 |

Rate limit information is included in response headers:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 2025-01-15T12:00:00Z
```

When you exceed the rate limit, you'll receive a `429 Too Many Requests` response.

---

## Endpoints

### Chains

#### List All Chains

Get all QR code chains for your organization.

**Request:**

```http
GET /api/v1/chains
```

**Response:**

```json
{
  "chains": [
    {
      "id": 1,
      "name": "Event Tickets - Concert 2025",
      "description": "Morphing QR codes for concert entry",
      "chainLength": 100,
      "currentIndex": 95,
      "remaining": 96,
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

#### Create a New Chain

Create a new morphing QR code chain.

**Request:**

```http
POST /api/v1/chains
Content-Type: application/json

{
  "name": "Product Authentication Batch #42",
  "description": "Anti-counterfeiting codes for product line",
  "chainLength": 500
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Name of the chain (1-255 characters) |
| `description` | string | No | Optional description |
| `chainLength` | integer | No | Length of hash chain (10-10,000, default: 100) |

**Response:**

```json
{
  "chainId": 42,
  "name": "Product Authentication Batch #42",
  "chainLength": 500,
  "message": "Chain created successfully"
}
```

---

#### Get Chain Details

Retrieve details of a specific chain.

**Request:**

```http
GET /api/v1/chains/:chainId
```

**Response:**

```json
{
  "id": 42,
  "name": "Product Authentication Batch #42",
  "description": "Anti-counterfeiting codes for product line",
  "chainLength": 500,
  "currentIndex": 499,
  "remaining": 500,
  "isActive": true,
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

---

#### Get Current QR Code

Get the current active QR code for a chain.

**Request:**

```http
GET /api/v1/chains/:chainId/current
```

**Response:**

```json
{
  "chainId": 42,
  "chainName": "Product Authentication Batch #42",
  "currentIndex": 499,
  "hashValue": "a3f5b8c9d2e1f4a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "remaining": 500,
  "totalLength": 500,
  "isActive": true
}
```

The `qrCode` field contains a base64-encoded PNG image that can be displayed directly.

---

#### Validate and Scan QR Code

Validate a scanned QR code and advance the chain.

**Request:**

```http
POST /api/v1/chains/:chainId/scan
Content-Type: application/json

{
  "hashValue": "a3f5b8c9d2e1f4a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0"
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "QR code scanned successfully",
  "chainId": 42,
  "newIndex": 498,
  "remaining": 499,
  "chainExhausted": false
}
```

**Response (Already Scanned):**

```json
{
  "error": "QR code already scanned"
}
```

**Response (Invalid):**

```json
{
  "error": "Invalid QR code"
}
```

---

### Scans

#### Get Scan History

Retrieve scan history for a chain.

**Request:**

```http
GET /api/v1/chains/:chainId/scans?limit=100
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `limit` | integer | No | Number of scans to return (1-1000, default: 100) |

**Response:**

```json
{
  "scans": [
    {
      "id": 1523,
      "chainId": 42,
      "hashId": 8945,
      "hashValue": "a3f5b8c9d2e1f4a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0",
      "chainIndex": 499,
      "isValid": true,
      "scannedBy": null,
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "errorMessage": null,
      "scannedAt": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

### Statistics

#### Get Chain Statistics

Get analytics and statistics for a chain.

**Request:**

```http
GET /api/v1/chains/:chainId/stats
```

**Response:**

```json
{
  "totalScans": 1,
  "validScans": 1,
  "invalidScans": 0,
  "chainLength": 500,
  "currentIndex": 498,
  "remaining": 499,
  "scanned": 1,
  "percentComplete": "0.2"
}
```

---

## Webhooks

Configure webhooks in your organization settings to receive real-time notifications when QR codes are scanned.

### Webhook Events

#### `scan.success`

Triggered when a QR code is successfully scanned and validated.

**Payload:**

```json
{
  "event": "scan.success",
  "chainId": 42,
  "chainName": "Product Authentication Batch #42",
  "hashValue": "a3f5b8c9d2e1f4a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0",
  "index": 499,
  "remaining": 499,
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Webhook Signature Verification

All webhook requests include an `X-Webhook-Signature` header containing an HMAC-SHA256 signature. Verify this signature to ensure the request came from our servers.

**Example (Node.js):**

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return signature === expectedSignature;
}

// In your webhook handler:
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const isValid = verifyWebhookSignature(req.body, signature, YOUR_WEBHOOK_SECRET);
  
  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook event
  console.log('Scan event:', req.body);
  res.json({ received: true });
});
```

---

## Error Handling

The API uses standard HTTP status codes:

| Status Code | Meaning |
|-------------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request - Invalid parameters |
| `401` | Unauthorized - Invalid or missing API key |
| `403` | Forbidden - Insufficient permissions |
| `404` | Not Found - Resource doesn't exist |
| `429` | Too Many Requests - Rate limit exceeded |
| `500` | Internal Server Error |

**Error Response Format:**

```json
{
  "error": "Chain not found"
}
```

---

## Code Examples

### Python

```python
import requests

API_KEY = "your_api_key_here"
BASE_URL = "https://your-domain.com/api/v1"

headers = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}

# Create a new chain
response = requests.post(
    f"{BASE_URL}/chains",
    headers=headers,
    json={
        "name": "My First Chain",
        "chainLength": 100
    }
)

chain = response.json()
chain_id = chain["chainId"]
print(f"Created chain: {chain_id}")

# Get current QR code
response = requests.get(
    f"{BASE_URL}/chains/{chain_id}/current",
    headers=headers
)

qr_data = response.json()
print(f"Current hash: {qr_data['hashValue']}")
print(f"Remaining: {qr_data['remaining']}")

# Scan a QR code
response = requests.post(
    f"{BASE_URL}/chains/{chain_id}/scan",
    headers=headers,
    json={
        "hashValue": qr_data["hashValue"]
    }
)

scan_result = response.json()
print(f"Scan successful: {scan_result['success']}")
print(f"New remaining: {scan_result['remaining']}")
```

### JavaScript (Node.js)

```javascript
const axios = require('axios');

const API_KEY = 'your_api_key_here';
const BASE_URL = 'https://your-domain.com/api/v1';

const headers = {
  'X-API-Key': API_KEY,
  'Content-Type': 'application/json'
};

async function createChain() {
  const response = await axios.post(
    `${BASE_URL}/chains`,
    {
      name: 'My First Chain',
      chainLength: 100
    },
    { headers }
  );
  
  return response.data.chainId;
}

async function getCurrentQR(chainId) {
  const response = await axios.get(
    `${BASE_URL}/chains/${chainId}/current`,
    { headers }
  );
  
  return response.data;
}

async function scanQR(chainId, hashValue) {
  const response = await axios.post(
    `${BASE_URL}/chains/${chainId}/scan`,
    { hashValue },
    { headers }
  );
  
  return response.data;
}

// Usage
(async () => {
  try {
    const chainId = await createChain();
    console.log(`Created chain: ${chainId}`);
    
    const qrData = await getCurrentQR(chainId);
    console.log(`Current hash: ${qrData.hashValue}`);
    
    const scanResult = await scanQR(chainId, qrData.hashValue);
    console.log(`Scan successful: ${scanResult.success}`);
    console.log(`Remaining: ${scanResult.remaining}`);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
})();
```

### cURL

```bash
# Create a chain
curl -X POST https://your-domain.com/api/v1/chains \
  -H "X-API-Key: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Chain",
    "chainLength": 100
  }'

# Get current QR code
curl https://your-domain.com/api/v1/chains/1/current \
  -H "X-API-Key: your_api_key_here"

# Scan a QR code
curl -X POST https://your-domain.com/api/v1/chains/1/scan \
  -H "X-API-Key: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "hashValue": "a3f5b8c9d2e1f4a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0"
  }'
```

---

## Support

For API support, please contact:
- **Email:** support@your-domain.com
- **Documentation:** https://docs.your-domain.com
- **Status Page:** https://status.your-domain.com

---

**Last Updated:** January 2025  
**Author:** Manus AI
