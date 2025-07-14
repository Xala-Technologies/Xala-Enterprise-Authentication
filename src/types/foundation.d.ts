/**
 * Type declarations for @xala-technologies/foundation
 * Temporary until foundation package exports proper types
 */

declare module '@xala-technologies/foundation' {
  // Logger types
  export interface Logger {
    debug(message: string, metadata?: Record<string, unknown>): void;
    info(message: string, metadata?: Record<string, unknown>): void;
    warn(message: string, metadata?: Record<string, unknown>): void;
    error(message: string, metadata?: Record<string, unknown>): void;
    fatal(message: string, metadata?: Record<string, unknown>): void;
  }

  export interface LoggerOptions {
    serviceName: string;
    nsmClassification?: string;
    gdprCompliant?: boolean;
    auditTrail?: boolean;
  }

  export class Logger {
    static create(options: LoggerOptions): Logger;
  }

  // EventCore types
  export interface EventCore {
    emit(event: string, data: EventData): void;
    on(event: string, handler: (data: EventData) => void): void;
    off(event: string, handler: (data: EventData) => void): void;
    once(event: string, handler: (data: EventData) => void): void;
  }

  export interface EventData {
    id: string;
    type: string;
    source: string;
    timestamp: Date;
    nsmClassification?: string;
    gdprProtected?: boolean;
    auditTrail?: boolean;
    [key: string]: unknown;
  }

  export interface EventCoreOptions {
    serviceName?: string;
    nsmClassification?: string;
    gdprCompliant?: boolean;
    auditTrail?: boolean;
  }

  export class EventCore {
    static create(options?: EventCoreOptions): EventCore;
  }
}
