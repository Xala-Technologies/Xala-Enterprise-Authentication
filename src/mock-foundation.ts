/**
 * Mock Foundation Types for Development Build
 * These mock the @xala-technologies/foundation package for building without external dependencies
 */

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export interface EventData {
  readonly id: string;
  readonly type: string;
  readonly source: string;
  readonly [key: string]: unknown;
}

export interface EventCore {
  emit(eventType: string, data: EventData): void;
  on(eventType: string, handler: (data: EventData) => void): void;
  off(eventType: string, handler: (data: EventData) => void): void;
}

export class Logger {
  private serviceName: string;

  constructor(options: { serviceName: string; [key: string]: unknown }) {
    this.serviceName = options.serviceName;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    console.debug(`[${this.serviceName}] ${message}`, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    console.info(`[${this.serviceName}] ${message}`, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(`[${this.serviceName}] ${message}`, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(`[${this.serviceName}] ${message}`, meta);
  }

  static create(options: { serviceName: string; [key: string]: unknown }): Logger {
    return new Logger(options);
  }
}

export class EventCore {
  private handlers = new Map<string, Array<(data: EventData) => void>>();

  emit(eventType: string, data: EventData): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.forEach(handler => handler(data));
  }

  on(eventType: string, handler: (data: EventData) => void): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
  }

  off(eventType: string, handler: (data: EventData) => void): void {
    const handlers = this.handlers.get(eventType) || [];
    const index = handlers.indexOf(handler);
    if (index >= 0) {
      handlers.splice(index, 1);
      this.handlers.set(eventType, handlers);
    }
  }

  static create(options: { serviceName: string; [key: string]: unknown }): EventCore {
    return new EventCore();
  }
}