/**
 * Mock Foundation Types for Build
 * Temporary mock to enable building without foundation dependency
 */

export interface LoggerConfig {
  serviceName: string;
  nsmClassification?: string;
  gdprCompliant?: boolean;
  auditTrail?: boolean;
}

export class Logger {
  constructor(private readonly config: LoggerConfig) {}

  static create(config: LoggerConfig): Logger {
    return new Logger(config);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    console.debug(`[DEBUG] ${this.config.serviceName}: ${message}`, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    console.info(`[INFO] ${this.config.serviceName}: ${message}`, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(`[WARN] ${this.config.serviceName}: ${message}`, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(`[ERROR] ${this.config.serviceName}: ${message}`, meta);
  }
}

export interface EventData {
  id: string;
  type: string;
  source: string;
  [key: string]: unknown;
}

export interface EventConfig {
  serviceName: string;
  nsmClassification?: string;
  gdprCompliant?: boolean;
  auditTrail?: boolean;
}

export class EventCore {
  constructor(private readonly config: EventConfig) {}

  static create(config: EventConfig): EventCore {
    return new EventCore(config);
  }

  emit(eventType: string, data: EventData): void {
    console.log(`[EVENT] ${this.config.serviceName}: ${eventType}`, data);
  }
}
