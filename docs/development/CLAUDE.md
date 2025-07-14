# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Xala Enterprise ecosystem is a comprehensive, enterprise-grade TypeScript monorepo focused on Norwegian compliance (NSM, GDPR, WCAG AAA) and AI-powered development. It consists of 14 packages organized in a layered architecture with shared enterprise standards.

## Architecture

### Package Layers

- **Standards Layer**: `enterprise-standards` - Configuration and compliance framework
- **Foundation Layer**: `foundation` - Core services (logging, events, DI, configuration)
- **Domain Layer**: Business and data services
- **Application Layer**: UI system, API scaffolding, testing infrastructure

### Key Dependencies

- All packages depend on `@xala-technologies/enterprise-standards`
- Domain packages depend on `@xala-technologies/foundation`
- Uses `workspace:*` for internal package references

## Essential Commands

### Workspace-Level Development

```bash
# Install all dependencies
pnpm install

# Build all packages
pnpm run build

# Run all tests across workspace
pnpm run test

# Development mode (all packages in parallel)
pnpm dev

# Complete validation pipeline
pnpm run validate:all
```

### Package-Level Development

```bash
# Build individual package
pnpm run build

# Development with watch mode
pnpm run dev          # TypeScript watch mode

# Testing
pnpm run test         # Run tests
pnpm run test:watch   # Watch mode
pnpm run test:coverage # With coverage (95%+ required)
pnpm run test -- path/to/test.spec.ts  # Run single test file

# Code quality
pnpm run lint         # ESLint (--max-warnings 0)
pnpm run lint:fix     # Auto-fix issues
pnpm run format       # Prettier formatting
pnpm run type-check   # TypeScript validation
pnpm run validate     # Combined type-check + lint + test
```

### Norwegian Compliance & Enterprise Standards

```bash
# Norwegian compliance validation (CRITICAL)
pnpm run norwegian-compliance
npx enterprise-standards validate --norwegian-compliance
npx enterprise-standards validate --nsm      # NSM security standards
npx enterprise-standards validate --gdpr     # GDPR compliance
npx enterprise-standards validate --wcag     # WCAG accessibility

# Security scanning
pnpm run security-scan
npx enterprise-standards validate --security --object-injection-check
npx enterprise-standards type-safety-report  # Type safety analysis

# Generate enterprise configurations
npx enterprise-standards generate --platform nextjs
npx enterprise-standards generate --platform nestjs
npx enterprise-standards info                # Show package info

# AI integration setup
npx enterprise-standards generate cursorrules
npx enterprise-standards generate mcp-server
npx enterprise-standards ai --platform nextjs --verbose
```

### MCP Server Integration (AI Development)

```bash
# Get package implementation plans
mcp-tool get_package_plan --packageName foundation
mcp-tool get_master_plan                    # Ecosystem overview

# Use specialist agents
mcp-tool agent_execute_task --agentType system-analyst
mcp-tool agent_execute_task --agentType security-specialist

# Testing and validation guidance
mcp-tool get_testing_strategy
mcp-tool get_reports_index
```

### Database Operations (NestJS apps)

```bash
pnpm run db:generate  # Generate Prisma client
pnpm run db:migrate   # Run migrations
pnpm run db:studio    # Open Prisma Studio
pnpm run db:seed      # Seed test data
```

## Core Architecture Patterns

### Norwegian Compliance First

Every service must include:

```typescript
interface NorwegianCompliance {
  nsmClassification: 'OPEN' | 'RESTRICTED' | 'CONFIDENTIAL' | 'SECRET';
  gdprCompliant: boolean;
  wcagLevel: 'A' | 'AA' | 'AAA';
  supportedLanguages: ['nb-NO', 'en-US', 'fr-FR', 'ar-SA'];
  auditTrail: boolean;
}
```

### Factory Pattern for Services

```typescript
export class ServiceName {
  static create(options: Partial<Config> = {}): ServiceName {
    return new ServiceName(options);
  }
}
```

### Dependency Injection Container

Use the enterprise DI container from foundation:

```typescript
import { DIContainer } from '@xala-technologies/foundation';

const container = DIContainer.create();
container.register('serviceId', serviceFactory, {
  lifecycle: 'singleton',
  nsmClassification: 'RESTRICTED',
});
```

### Event-Driven Architecture

```typescript
import { EventCore } from '@xala-technologies/foundation';

const events = EventCore.create();
events.emit('eventType', {
  data: payload,
  nsmClassification: 'RESTRICTED',
  gdprProtected: true,
});
```

## Development Standards

### TypeScript Requirements

- **ZERO tolerance for 'any' type** - always create specific types
- Explicit return types for all functions
- Strict null checks and proper error handling
- Use type guards from enterprise-standards
- Maximum cyclomatic complexity: 10

### Code Quality Standards

- Maximum 200 lines per file
- Maximum 20 lines per function
- 95%+ test coverage required
- All modules must initialize in <100ms
- Memory usage <50MB per module

### Security Requirements

- Object injection prevention using safe access patterns
- Path traversal validation in file operations
- Input sanitization for all public APIs
- Audit trails for sensitive operations
- NSM classification on all data handling

## Package-Specific Notes

### enterprise-standards

- CLI tool: `npx enterprise-standards <command>`
- Self-contained configuration generation
- Platform support: nextjs, nestjs, react-native, electron, library
- Build: Rollup with TypeScript

### foundation

- Core dependency for all domain packages
- Services: ConfigLoader, Logger, EventCore, DIContainer, HealthCheck
- Norwegian compliance utilities
- MCP server integration for AI development

### SaaS Template (xala-saas-template)

- Complete Next.js + NestJS application template
- Norwegian design tokens and compliance validation
- Multi-tenant architecture with RBAC
- Agent-driven development workflow

## Testing Strategy

### Test Structure

```bash
# Run single test file
pnpm run test -- path/to/test.spec.ts

# Test specific pattern
pnpm run test -- --testNamePattern="norwegian compliance"

# Coverage requirements
pnpm run test:coverage # Must achieve 95%+ in all metrics
```

### Test Categories

- Unit tests with Norwegian compliance scenarios
- Integration tests for cross-package interactions
- Performance tests for initialization timing
- Security tests for object injection prevention
- Accessibility tests for WCAG AAA compliance

## AI Integration & Agent-Driven Development

### MCP Server Configuration

The ecosystem includes comprehensive MCP (Model Context Protocol) server integration for AI-assisted development:

```bash
# Generate MCP configuration
npx enterprise-standards generate mcp-server

# Use MCP tools for guidance
mcp-tool get_package_plan --packageName foundation
mcp-tool get_master_plan                    # Get ecosystem overview
mcp-tool agent_execute_task --agentType system-analyst
mcp-tool get_testing_strategy              # Get comprehensive testing guidance
mcp-tool get_reports_index                 # Access implementation reports
```

### Specialist Agent Integration

The ecosystem supports specialist agents for domain-specific implementation:

- **SecuritySpecialistAgent** - NSM, GDPR, security compliance
- **AuthenticationSpecialistAgent** - OAuth 2.1, Norwegian government ID integration
- **DataSpecialistAgent** - GDPR-compliant data handling, enterprise ORM
- **UISpecialistAgent** - Norwegian design system, WCAG compliance
- **IntegrationSpecialistAgent** - API gateway, webhook management

### Cursor Rules Integration

Key packages include `.cursorrules` files with:

- **Zero tolerance for 'any' type** - Enterprise TypeScript enforcement
- **Norwegian compliance rules** - NSM, GDPR, WCAG validation
- **Security-first development patterns** - Object injection prevention
- **Performance requirements** - Sub-100ms initialization, <50MB memory usage
- **Quality standards** - 200 lines/file max, 20 lines/function max, complexity ≤ 10

## Critical Requirements

### Before Making Changes

1. Always read existing files to understand context
2. Check TypeScript errors: `pnpm run type-check`
3. Validate compliance: `pnpm run norwegian-compliance`
4. Run security scan: `pnpm run security-scan`
5. Use MCP tools for guidance: `mcp-tool get_package_plan --packageName {PACKAGE}`

### Quality Gates (MANDATORY)

1. `pnpm run validate` - Combined type-check + lint + test
2. `pnpm run validate:comprehensive` - Full enterprise validation including Norwegian compliance
3. Zero TypeScript errors, ESLint warnings, or test failures
4. Coverage must remain at 95%+ across all metrics (branches, functions, lines, statements)
5. Norwegian compliance validation must pass: `npx enterprise-standards validate --norwegian-compliance`

### Breaking Changes

- Foundation package changes affect entire ecosystem (12+ dependent packages)
- Always maintain backward compatibility - use deprecation warnings before removal
- Update package versions following semantic versioning
- Test against dependent packages before publishing
- Document migration paths for breaking changes

## Deployment & CI/CD

### Production Validation

```bash
pnpm run ci:validate  # Full CI pipeline
pnpm run ci:build     # Production build
pnpm run ci:test      # CI testing with coverage
```

### Norwegian Regulatory Compliance

- All data processing must specify NSM classification
- GDPR compliance validation on all personal data operations
- Audit trails required for RESTRICTED and above classifications
- WCAG AAA validation for all UI components

## Support and Documentation

- Package-specific documentation in each `docs/` directory
- Implementation plans in `enterprise-standards/docs/implementation/`
- Comprehensive test results in various `reports/` directories
- Norwegian design system documentation in `ui-system/resources/`
