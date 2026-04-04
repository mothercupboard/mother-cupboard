# Mother Cupboard

A smart pantry & meal-suggestion app built with Expo (React Native) and AWS Lambda.

## Structure

```
mother-cupboard/
├── mobile/     # Expo React Native app (Obytes starter)
├── backend/    # AWS Lambda functions (Serverless Framework)
└── shared/     # Shared TypeScript types
```

## Getting Started

### Prerequisites
- Node.js 20+
- Yarn 4+
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)

### Install

```bash
yarn install
```

### Run mobile app

```bash
cd mobile
yarn start
```

### Run on simulators

```bash
# iOS
yarn ios

# Android
yarn android
```

## Workspaces

- `mobile` — React Native app using Expo Router, React Native Paper (Warm Hearth theme), Zustand, React Query
- `backend` — AWS Lambda functions using Serverless Framework
- `shared` — TypeScript types shared between mobile and backend
