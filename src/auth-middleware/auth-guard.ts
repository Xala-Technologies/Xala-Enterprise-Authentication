/**
 * Base Authentication Guard
 * Verifies user authentication status
 * Enterprise Standards v4.0.0 compliant
 */

import type {
  AuthenticationGuard,
  AuthMiddleware,
  AuthContext,
  AuthRequest,
  AuthResponse,
  NextFunction,
  GuardOptions,
  TokenExtractor,
  SessionValidator,
} from './types.js';

export class AuthGuard implements AuthenticationGuard {
  readonly name: string = 'auth-guard';
  readonly middleware: AuthMiddleware;

  private readonly options: GuardOptions;
  private readonly tokenExtractor: TokenExtractor;
  private readonly sessionValidator: SessionValidator;

  constructor(
    tokenExtractor: TokenExtractor,
    sessionValidator: SessionValidator,
    options: GuardOptions = {},
  ) {
    this.tokenExtractor = tokenExtractor;
    this.sessionValidator = sessionValidator;
    this.options = options;
    this.middleware = this.createMiddleware();
  }

  async canActivate(context: AuthContext): Promise<boolean> {
    return context.authenticated && !!context.user;
  }

  private createMiddleware(): AuthMiddleware {
    return async (
      req: AuthRequest,
      res: AuthResponse,
      next: NextFunction,
    ): Promise<void> => {
      try {
        // Skip for public routes if configured
        if (this.options.skipOnPublicRoutes && this.isPublicRoute(req.path)) {
          return next();
        }

        // Extract token
        const token = this.tokenExtractor.extract(req);
        if (!token) {
          return this.handleUnauthorized(
            req,
            res,
            'No authentication token provided',
          );
        }

        // Validate session
        const context = await this.sessionValidator.validate(token);
        if (!context) {
          return this.handleUnauthorized(
            req,
            res,
            'Invalid or expired session',
          );
        }

        // Check if guard allows access
        const canActivate = await this.canActivate(context);
        if (!canActivate) {
          return this.handleUnauthorized(req, res, 'Access denied');
        }

        // Attach auth context to request
        req.auth = context;
        next();
      } catch (error) {
        if (this.options.throwOnFailure) {
          next(error as Error);
        } else {
          this.handleUnauthorized(req, res, 'Authentication error');
        }
      }
    };
  }

  private handleUnauthorized(
    _req: AuthRequest,
    res: AuthResponse,
    message: string,
  ): void {
    if (this.options.failureRedirect) {
      res.status(302);
      res.setHeader('Location', this.options.failureRedirect);
      res.send('Redirecting...');
    } else {
      res.status(401);
      res.json({
        error: 'UNAUTHORIZED',
        message: this.options.failureMessage ?? message,
      });
    }
  }

  private isPublicRoute(path: string): boolean {
    // Define public routes that don't require authentication
    const publicRoutes = [
      '/auth/login',
      '/auth/register',
      '/auth/forgot-password',
      '/health',
      '/api/v1/public',
    ];

    return publicRoutes.some((route) => path.startsWith(route));
  }

  static create(
    tokenExtractor: TokenExtractor,
    sessionValidator: SessionValidator,
    options?: GuardOptions,
  ): AuthGuard {
    return new AuthGuard(tokenExtractor, sessionValidator, options);
  }
}

/**
 * Default token extractor implementation
 */
export class BearerTokenExtractor implements TokenExtractor {
  extract(req: AuthRequest): string | null {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && typeof authHeader === 'string') {
      const [type, token] = authHeader.split(' ');
      if (type?.toLowerCase() === 'bearer' && token) {
        return token;
      }
    }

    // Check cookies
    if (req.cookies?.accessToken) {
      return req.cookies.accessToken;
    }

    // Check query parameter (less secure, use with caution)
    const queryToken = req.query?.access_token;
    if (queryToken && typeof queryToken === 'string') {
      return queryToken;
    }

    return null;
  }

  static create(): BearerTokenExtractor {
    return new BearerTokenExtractor();
  }
}
