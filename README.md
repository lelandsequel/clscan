# 🔄 Morphing QR Code System

A revolutionary scannable code system that changes after each use. Every user gets a unique code, creating an unbreakable chain of sequential, verifiable interactions.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)

## 🌟 Features

### Core Technology
- **Cryptographic Hash Chains** - SHA-256 based sequential codes
- **One-Time Use** - Each code becomes invalid after scanning
- **Real-Time Morphing** - Instant code updates after validation
- **Complete Audit Trail** - Track every scan with timestamps and metadata

### Enterprise Features
- **REST API** - Full programmatic access with authentication
- **Webhook Notifications** - Real-time scan event notifications
- **White-Label Branding** - Custom logos, colors, and domains
- **Multi-User Organizations** - Role-based access control (Owner/Admin/Member/Viewer)
- **Data Export** - CSV and PDF reports
- **Payment Integration** - Stripe subscriptions with multiple tiers
- **Rate Limiting** - Plan-based API throttling

## 🎯 Use Cases

- **Event Ticketing** - Prevent screenshot sharing and ticket fraud
- **Access Control** - One-time-use credentials for secure entry
- **Supply Chain** - Track products through each handler
- **Anti-Counterfeiting** - Verify product authenticity

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- MySQL/TiDB database
- Stripe account (for payments)

### Installation

```bash
# Clone the repository
git clone https://github.com/lelandsequel/clscan.git
cd clscan

# Install dependencies
pnpm install

# Configure environment variables in your deployment platform

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

## 📖 Documentation

### API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference.

### Quick API Example

```javascript
const API_KEY = 'your_api_key';
const BASE_URL = 'https://your-domain.com/api/v1';

// Create a new QR chain
const response = await fetch(`${BASE_URL}/chains`, {
  method: 'POST',
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Event Tickets',
    chainLength: 100
  })
});

const { chainId } = await response.json();

// Get current QR code
const qrResponse = await fetch(`${BASE_URL}/chains/${chainId}/current`, {
  headers: { 'X-API-Key': API_KEY }
});

const { qrCode, hashValue } = await qrResponse.json();
```

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- React 19 + TypeScript
- Tailwind CSS 4
- tRPC for type-safe API calls
- Wouter for routing
- shadcn/ui components

**Backend:**
- Node.js + Express
- tRPC 11
- Drizzle ORM
- MySQL/TiDB database
- Stripe for payments

**Security:**
- SHA-256 hash chains
- JWT authentication
- API key authentication
- Rate limiting
- Webhook signature verification

### Database Schema

```sql
-- QR Chains
qr_chains (id, name, description, chain_length, current_index, is_active, ...)

-- Hash Chain
qr_hashes (id, chain_id, hash_value, index, is_used, ...)

-- Scan History
scans (id, chain_id, hash_id, is_valid, scanned_at, ip_address, ...)

-- Organizations
organizations (id, name, plan, stripe_customer_id, api_key, ...)

-- Users
users (id, open_id, name, email, role, ...)
```

## 🔐 Security

- **Hash Chain Cryptography** - Each code is mathematically linked to the next
- **One-Time Use Enforcement** - Database-level validation prevents reuse
- **API Authentication** - Bearer token and API key support
- **Rate Limiting** - Prevents abuse and DDoS attacks
- **Webhook Signatures** - HMAC-SHA256 verification
- **Audit Logging** - Complete scan history with metadata

## 💳 Subscription Plans

| Plan | Price | API Requests/Hour | QR Chains | Features |
|------|-------|-------------------|-----------|----------|
| **Free** | $0 | 100 | 5 | Basic analytics, Email support |
| **Starter** | $29/mo | 1,000 | 50 | Webhooks, CSV/PDF export, Priority support |
| **Professional** | $99/mo | 10,000 | Unlimited | White-label, Custom domain, Advanced analytics |
| **Enterprise** | $299/mo | 100,000 | Unlimited | SLA, Dedicated support, Phone support |

## 🛠️ Development

### Project Structure

```
├── client/              # React frontend
│   ├── src/
│   │   ├── pages/      # Page components
│   │   ├── components/ # Reusable UI components
│   │   └── lib/        # tRPC client setup
├── server/              # Express backend
│   ├── routers.ts      # tRPC procedures
│   ├── db.ts           # Database queries
│   ├── hashChain.ts    # Cryptography logic
│   ├── apiRouter.ts    # REST API endpoints
│   └── stripeRouter.ts # Payment integration
├── drizzle/            # Database schema
└── shared/             # Shared types
```

### Available Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm db:push      # Push schema changes to database
pnpm db:studio    # Open Drizzle Studio
```

### Testing

```bash
# Test with Stripe test card
Card: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
```

## 🚢 Deployment

The application is designed to deploy on any Node.js hosting platform:

- **Vercel** - Recommended for easy deployment
- **Railway** - Great for full-stack apps
- **AWS/GCP/Azure** - For enterprise deployments
- **Docker** - Container-ready

### Environment Setup

1. Set up MySQL/TiDB database
2. Configure environment variables in your platform
3. Run `pnpm db:push` to create tables
4. Deploy frontend and backend
5. Configure Stripe webhooks

## 📊 Monitoring

- **Scan Analytics** - Real-time dashboard
- **API Usage** - Rate limit tracking
- **Error Logging** - Complete audit trail
- **Webhook Delivery** - Event tracking

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [Manus AI](https://manus.im)
- Cryptographic hash chains inspired by academic research
- UI components from [shadcn/ui](https://ui.shadcn.com)

## 📞 Support

- **Documentation:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Issues:** [GitHub Issues](https://github.com/lelandsequel/clscan/issues)

---

**Built with ❤️ using cryptographic hash chains and modern web technology**
