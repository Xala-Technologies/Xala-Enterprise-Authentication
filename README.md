# 🔐 @xala-technologies/authentication

**Enterprise Authentication Library with Norwegian Support**

[![Enterprise Standards](https://img.shields.io/badge/Enterprise%20Standards-v6.0.2-blue.svg)](https://github.com/xala-technologies/enterprise-standards)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Build Status](https://img.shields.io/badge/Build-Passing-green.svg)](./FINAL_VALIDATION_REPORT.md)
[![Production Ready](https://img.shields.io/badge/Production-Ready-green.svg)](./FINAL_VALIDATION_REPORT.md)

## 🚀 **Simplified & Production Ready**

This authentication library is **production-ready** with Enterprise Standards v6.0.2 compliance. The package follows **Option 1: Minimal Compliance** approach - focusing on core authentication functionality while providing essential Norwegian market support.

### ✨ **Key Features**
- **Core Authentication**: Session management, token handling, user authentication
- **Norwegian ID Providers**: BankID, Buypass, Commfides integration ready
- **NSM Classification**: Basic Norwegian security level support
- **eIDAS Support**: European cross-border authentication
- **RBAC System**: Role-based access control and permissions
- **React Components**: Authentication UI helpers and hooks
- **Enterprise Standards**: v6.0.2 configuration compliance

---

## 📦 **Installation**

```bash
# Using npm
npm install @xala-technologies/authentication

# Using pnpm (recommended)
pnpm add @xala-technologies/authentication

# Using yarn
yarn add @xala-technologies/authentication
```

## 🏗️ **Architecture Overview**

### **Focused Package Structure**
```
@xala-technologies/authentication/
├── auth-core/              # Session and token management
├── auth-providers/         # Norwegian ID, OAuth, eIDAS providers
├── auth-middleware/        # Authentication guards and middleware
├── auth-permissions/       # RBAC and permission system
├── auth-ui-helpers/        # React components and hooks
├── utils/                  # Norwegian validation utilities
└── types/                  # TypeScript interfaces
```

### **What's Included**
✅ **Core Authentication Features**
- Session management with automatic renewal
- JWT token handling with secure storage
- User profile management
- Authentication state management

✅ **Norwegian Market Support**
- Personal number validation (Modulo 11)
- Phone number format validation
- NSM security classification levels
- BankID/Buypass/Commfides provider setup

✅ **Enterprise Features**
- Role-based access control (RBAC)
- Permission-based route guards
- Authentication middleware
- React authentication components

### **What's Removed** (Available in Separate Packages)
❌ Heavy GDPR automation workflows
❌ Complex compliance reporting systems
❌ Automated audit trail management
❌ Over-engineered authentication features

---

## 🚀 **Quick Start**

### **Basic Setup**

```typescript
import {
  createAuthenticationService,
  SessionManager,
  TokenManager
} from '@xala-technologies/authentication';

// Initialize authentication service
const authService = createAuthenticationService({
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  enableTokenRefresh: true,
  nsmClassification: 'CONFIDENTIAL'
});

// Session management
const sessionManager = new SessionManager({
  timeout: 30 * 60 * 1000,
  storageType: 'secure'
});

// Token management
const tokenManager = new TokenManager({
  issuer: 'your-app',
  audience: 'your-audience',
  enableJWKS: true
});
```

### **Norwegian ID Provider Setup**

```typescript
import { NorwegianIDProvider, ProviderFactory } from '@xala-technologies/authentication';

// BankID configuration
const bankIdProvider = ProviderFactory.createNorwegianProvider({
  type: 'bankid',
  config: {
    clientId: 'your-bankid-client-id',
    clientSecret: 'your-bankid-secret',
    discoveryUrl: 'https://bankid.api.url',
    merchantName: 'Your Company'
  }
});

// Buypass configuration
const buypassProvider = ProviderFactory.createNorwegianProvider({
  type: 'buypass',
  config: {
    clientId: 'your-buypass-client-id',
    clientSecret: 'your-buypass-secret',
    discoveryUrl: 'https://buypass.api.url'
  }
});
```

### **React Integration**

```tsx
import {
  AuthProvider,
  useAuth,
  ProtectedRoute,
  LoginForm
} from '@xala-technologies/authentication';

// App wrapper
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

// Using authentication hook
function Dashboard() {
  const { user, logout, hasRole } = useAuth();
  
  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      {hasRole('admin') && <AdminPanel />}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

---

## 🇳🇴 **Norwegian Market Features**

### **Personal Number Validation**
```typescript
import { validateNorwegianPersonalNumber } from '@xala-technologies/authentication';

// Validate Norwegian personal numbers
const isValid = validateNorwegianPersonalNumber('12345678901');
console.log(isValid); // true/false based on Modulo 11 algorithm
```

### **NSM Classification Support**
```typescript
import { 
  NSMClassificationLevels, 
  validateNSMClassification 
} from '@xala-technologies/authentication';

// Check classification access
const hasAccess = validateNSMClassification(
  userClassification: 'CONFIDENTIAL',
  requiredClassification: 'RESTRICTED'
);
```

### **Phone Number Validation**
```typescript
import { validateNorwegianPhoneNumber } from '@xala-technologies/authentication';

// Validate Norwegian mobile numbers
const isValidPhone = validateNorwegianPhoneNumber('+47 98765432');
console.log(isValidPhone); // true for valid Norwegian mobile numbers
```

---

## 🛡️ **Security Features**

### **Authentication Guards**
```typescript
import { AuthGuard, RoleGuard, NSMClassificationGuard } from '@xala-technologies/authentication';

// Basic authentication guard
app.use('/api/protected', AuthGuard);

// Role-based guard
app.use('/api/admin', RoleGuard(['admin', 'manager']));

// NSM classification guard
app.use('/api/classified', NSMClassificationGuard('CONFIDENTIAL'));
```

### **Permission System**
```typescript
import { PermissionManager, RBACService } from '@xala-technologies/authentication';

const rbac = new RBACService();

// Define roles and permissions
rbac.defineRole('admin', ['user:read', 'user:write', 'user:delete']);
rbac.defineRole('editor', ['user:read', 'user:write']);
rbac.defineRole('viewer', ['user:read']);

// Check permissions
const canEdit = rbac.hasPermission(user, 'user:write');
```

---

## 🧪 **Testing**

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Type checking
pnpm run type-check

# Linting
pnpm run lint
```

---

## 📊 **Enterprise Standards Compliance**

This package follows **Enterprise Standards v6.0.2**:

- ✅ **TypeScript**: Strict mode with comprehensive type safety
- ✅ **ESLint**: Enterprise security and quality rules
- ✅ **Jest**: Comprehensive testing framework
- ✅ **Prettier**: Consistent code formatting
- ✅ **Security**: Enterprise-grade security linting

### **Configuration Extensions**
- `@xala-technologies/enterprise-standards/configs/typescript/base.json`
- `@xala-technologies/enterprise-standards/configs/eslint/base.cjs`
- Enterprise Jest and Prettier configurations

---

## 🔄 **Migration from Heavy Compliance**

If you were using the full compliance version, here's what changed:

### **Removed Components**
- `auth-compliance/` directory (moved to separate packages)
- Heavy GDPR automation workflows
- Complex compliance reporting systems
- Automated audit trail management

### **Retained Essential Features**
- Basic NSM classification support
- Norwegian personal number validation
- Core authentication functionality
- Norwegian ID provider integration

### **Separate Packages Available**
- `@xala/gdpr-compliance` - GDPR automation and management
- `@xala/audit-trail` - Comprehensive audit logging
- `@xala/nsm-compliance` - Advanced NSM workflow automation

---

## 📚 **Documentation**

- [API Documentation](./docs/)
- [Enterprise Standards Guide](./docs/enterprise-standards/)
- [Final Validation Report](./FINAL_VALIDATION_REPORT.md)
- [Norwegian Integration Guide](./docs/norwegian-integration.md)

---

## 🤝 **Contributing**

1. Follow Enterprise Standards v6.0.2
2. Ensure TypeScript strict mode compliance
3. Add tests for new features
4. Update documentation

---

## 📄 **License**

Private package for Xala Technologies enterprise use.

---

## 📞 **Support**

For enterprise support and questions:
- Enterprise Standards: [Enterprise Standards Package](https://github.com/xala-technologies/enterprise-standards)
- Internal Documentation: Available in enterprise workspace
- Technical Support: Contact enterprise development team

---

**Version**: 1.0.2  
**Enterprise Standards**: v6.0.2  
**Production Ready**: ✅  
**Build Status**: ✅
