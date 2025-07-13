# @xala-technologies/authentication

Enterprise authentication package with OAuth 2.1, Norwegian ID integration, and comprehensive compliance features.

## Features

- **OAuth 2.1/OIDC** - Modern authentication with PKCE support
- **Norwegian ID Integration** - BankID, Buypass, Commfides support
- **eIDAS Cross-Border** - EU authentication compatibility
- **NSM Compliance** - Norwegian security classification support
- **GDPR Framework** - Data protection and privacy controls
- **RBAC System** - Role-based access control
- **Enterprise TypeScript** - Full type safety and strict mode

## Installation

```bash
# Using pnpm (recommended)
pnpm add @xala-technologies/authentication

# Using npm
npm install @xala-technologies/authentication

# Using yarn
yarn add @xala-technologies/authentication
```

## Quick Start

```typescript
import { 
  createAuthenticationService,
  type AuthenticationConfig 
} from '@xala-technologies/authentication';

const config: AuthenticationConfig = {
  nsmClassification: 'RESTRICTED',
  gdprCompliant: true,
  wcagLevel: 'AA',
  supportedLanguages: ['nb-NO', 'en-US'],
  auditTrail: true,
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  accessTokenLifetime: 15 * 60 * 1000, // 15 minutes
  refreshTokenLifetime: 24 * 60 * 60 * 1000, // 24 hours
  maxConcurrentSessions: 5,
  enableBruteForceProtection: true,
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000,
  sessionStorage: {
    type: 'memory',
    prefix: 'auth',
    ttl: 30 * 60 * 1000
  },
  providers: []
};

const authService = createAuthenticationService(config);
```

## Authentication Providers

### OAuth 2.1 Provider

```typescript
import { OAuthProvider, type OAuthProviderConfig } from '@xala-technologies/authentication';

const oauthConfig: OAuthProviderConfig = {
  id: 'google',
  name: 'Google OAuth',
  enabled: true,
  nsmClassification: 'RESTRICTED',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  authorizationUrl: 'https://accounts.google.com/oauth/authorize',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
  scopes: ['openid', 'profile', 'email'],
  redirectUri: '/auth/callback',
  pkce: true
};

const provider = OAuthProvider.create(oauthConfig);
```

### Norwegian ID Provider

```typescript
import { NorwegianIDProvider, type NorwegianIDProviderConfig } from '@xala-technologies/authentication';

const norwegianConfig: NorwegianIDProviderConfig = {
  id: 'norwegian-id',
  name: 'Norwegian ID',
  enabled: true,
  nsmClassification: 'CONFIDENTIAL',
  testMode: false,
  bankIdConfig: {
    clientId: 'your-bankid-client-id',
    clientSecret: 'your-bankid-secret',
    discoveryUrl: 'https://bankid.no/.well-known/openid_configuration',
    merchantName: 'Your Organization'
  }
};

const provider = NorwegianIDProvider.create(norwegianConfig);
```

## Session Management

```typescript
import { DefaultSessionManager } from '@xala-technologies/authentication';

const sessionManager = DefaultSessionManager.create(storage, {
  sessionTimeout: 30 * 60 * 1000,
  maxConcurrentSessions: 5,
  logger,
  events
});

// Create session
const session = await sessionManager.createSession(user, clientInfo, 'oauth');

// Validate session
const isValid = await sessionManager.validateSession(sessionId);

// Clean up expired sessions
await sessionManager.cleanupExpiredSessions();
```

## Norwegian Compliance

```typescript
import { 
  validateNorwegianPersonalNumber,
  validateNorwegianPhoneNumber,
  checkNSMClassificationAccess,
  type NSMClassification 
} from '@xala-technologies/authentication';

// Validate Norwegian personal number
const isValidPersonalNumber = validateNorwegianPersonalNumber('12345678901');

// Validate Norwegian phone number
const isValidPhone = validateNorwegianPhoneNumber('+47 12345678');

// Check NSM classification access
const hasAccess = checkNSMClassificationAccess(
  'RESTRICTED' as NSMClassification,
  'CONFIDENTIAL' as NSMClassification
);
```

## TypeScript Support

Full TypeScript support with enterprise-grade type safety:

```typescript
import type {
  AuthenticationConfig,
  UserProfile,
  SessionInfo,
  TokenClaims,
  NSMClassification
} from '@xala-technologies/authentication';

// All types are fully typed and validated
const user: UserProfile = {
  id: 'user-123',
  email: 'user@example.com',
  name: 'John Doe',
  roles: ['user'],
  permissions: ['read:profile'],
  nsmClassification: 'RESTRICTED',
  metadata: {}
};
```

## Package Status

- **Version:** 1.0.1
- **Build Status:** ✅ TypeScript compilation successful
- **Norwegian Compliance:** ✅ NSM, GDPR, DigDir standards
- **Enterprise Standards:** ✅ Strict TypeScript, ESLint validation
- **Testing:** 🔄 Jest configuration in progress

## Requirements

- Node.js >=18.0.0
- TypeScript >=5.0.0
- React >=16.8.0 (for UI components)

## License

MIT

## Support

For enterprise support and Norwegian compliance questions, contact Xala Technologies.

---

**Enterprise Authentication Package**  
Built with Norwegian compliance and enterprise standards.
