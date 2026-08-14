# Kapture Collections Voicebot

A voice-based collections agent prototype built using Node.js and Express.

## Features

- Customer identity verification
- Account details retrieval
- Payment negotiation flow
- Promise-to-pay (PTP) logging
- Payment link generation
- Call disposition
- Human-agent escalation
- Conversation state management

## Conversation Flow

AUTH_PENDING
→ AUTHENTICATED
→ NEGOTIATION
→ PTP_COLLECTED
→ CALL_ENDED

Customers can also be escalated to a human agent when required.

## Tech Stack

- Node.js
- Express.js
- REST API
- Vapi (voice agent integration)
- Git/GitHub

## Local Setup

### 1. Install dependencies

```bash
npm install