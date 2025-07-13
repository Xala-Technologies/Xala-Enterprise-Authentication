# Authentication Package Setup

## GitHub Token Setup

1. **Create a GitHub Personal Access Token:**
   - Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token with `read:packages` permission
   - Copy the token

2. **Update .env file:**
   ```bash
   # Replace 'your_github_token_here' with your actual token
   GITHUB_TOKEN=ghp_your_actual_token_here
   ```

3. **Install dependencies:**
   ```bash
   # Load environment variables and install
   source .env && pnpm install
   ```

## Alternative: Use NPM Registry Fallback

If GitHub packages are not available, you can temporarily use mock packages:

```bash
# Create local mock packages for development
mkdir -p node_modules/@xala-technologies/foundation
mkdir -p node_modules/@xala-technologies/enterprise-standards

# Install other dependencies
pnpm install --ignore-peerDeps
```

## Validation Pipeline

Once dependencies are installed, run the complete validation:

```bash
# Type checking
pnpm run type-check

# Linting
pnpm run lint

# Testing with coverage
pnpm run test:coverage

# Build
pnpm run build

# Norwegian compliance validation
pnpm run norwegian-compliance

# Security scan
pnpm run security-scan

# Complete validation
pnpm run validate:comprehensive
```

## Enterprise Standards Integration

If enterprise-standards package is available:

```bash
# Generate enterprise configurations
npx enterprise-standards generate --platform library
npx enterprise-standards validate --norwegian-compliance
npx enterprise-standards validate --security
npx enterprise-standards type-safety-report
```