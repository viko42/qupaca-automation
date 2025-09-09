# Wrote by AI

# Qupaca Casino Automation Tool

A React-based web application for automating casino operations on the Qupaca platform. This tool allows you to create and manage multiple game wallets, automate betting transactions, and track your gaming activity.

## Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager
- A web3 wallet (Ronin Wallet, RainbowKit compatible)

## Installation

1. **Clone the repository** (if not already done):
   ```bash
   git clone https://github.com/viko42/qupaca-automation
   cd qupaca-automation
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

## Running the Application

### 1. Start the Backend API

The backend API is required for RPC calls and jackpot verification. Start it first:

```bash
node backend-api.cjs
```

The API will start on `http://localhost:3500` and provides:
- RPC proxy to Ronin Chain
- Jackpot verification endpoint

### 2. Start the Frontend Development Server

In a new terminal window, start the Vite development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the port shown in your terminal).

## Usage

### Initial Setup

1. **Connect Your Wallet**: Use the RainbowKit wallet connector to connect your main wallet
2. **Set Password**: Create a secure password to encrypt your game wallets
3. **Create Game Wallets**: Generate new wallets for automated betting

### Security Features

- **Encrypted Storage**: All wallet private keys are encrypted using AES-GCM
- **Password Protection**: Access to wallets requires your master password
- **Private Key Export**: Securely export private keys when needed
