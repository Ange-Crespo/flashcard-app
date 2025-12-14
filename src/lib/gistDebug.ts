/**
 * Debug utility for Gist operations
 * Provides comprehensive logging and error tracking for sensitive gist functionality
 */

import { logger } from './logger';

export type DebugStep =
  | 'init'
  | 'parse_identifier'
  | 'validate_input'
  | 'validate_token'
  | 'fetch_raw_url'
  | 'fetch_api'
  | 'parse_response'
  | 'find_file'
  | 'parse_json'
  | 'validate_flashcards'
  | 'convert_format'
  | 'create_gist'
  | 'update_gist'
  | 'build_url'
  | 'complete'
  | 'error';

export interface DebugLogEntry {
  timestamp: number;
  step: DebugStep;
  message: string;
  data?: Record<string, unknown>;
  error?: string;
  level: 'info' | 'warn' | 'error' | 'success';
}

class GistDebugLogger {
  private logs: DebugLogEntry[] = [];
  private readonly maxLogs = 100;
  private enabled: boolean;

  constructor() {
    // Enable debug mode if localStorage flag is set or in development
    this.enabled =
      globalThis.window !== undefined &&
      (globalThis.window.localStorage.getItem('gist_debug_enabled') ===
        'true' ||
        import.meta.env.DEV);
  }

  enable() {
    this.enabled = true;
    if (globalThis.window !== undefined) {
      globalThis.window.localStorage.setItem('gist_debug_enabled', 'true');
    }
  }

  disable() {
    this.enabled = false;
    if (globalThis.window !== undefined) {
      globalThis.window.localStorage.removeItem('gist_debug_enabled');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  log(
    step: DebugStep,
    message: string,
    data?: Record<string, unknown>,
    level: DebugLogEntry['level'] = 'info'
  ) {
    const entry: DebugLogEntry = {
      timestamp: Date.now(),
      step,
      message,
      data,
      level,
    };

    this.logs.push(entry);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    if (this.enabled) {
      const prefix = `[Gist Debug] [${step.toUpperCase()}]`;
      const fullMessage = `${prefix} ${message}`;

      if (level === 'error') {
        logger.error(fullMessage, undefined, data);
      } else if (level === 'warn') {
        logger.warn(fullMessage, data);
      } else if (level === 'success') {
        logger.success(fullMessage, data);
      } else {
        logger.info(fullMessage, data);
      }
    }
  }

  error(
    step: DebugStep,
    message: string,
    error: unknown,
    data?: Record<string, unknown>
  ) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.log(
      step,
      message,
      { ...data, error: errorMessage, stack: errorStack },
      'error'
    );

    return {
      step,
      message,
      error: errorMessage,
      data,
    };
  }

  success(step: DebugStep, message: string, data?: Record<string, unknown>) {
    this.log(step, message, data, 'success');
  }

  warn(step: DebugStep, message: string, data?: Record<string, unknown>) {
    this.log(step, message, data, 'warn');
  }

  getLogs(): DebugLogEntry[] {
    return [...this.logs];
  }

  getLogsForStep(step: DebugStep): DebugLogEntry[] {
    return this.logs.filter(log => log.step === step);
  }

  getLastError(): DebugLogEntry | null {
    const errorLogs = this.logs.filter(log => log.level === 'error');
    return errorLogs.length > 0 ? (errorLogs.at(-1) ?? null) : null;
  }

  clear() {
    this.logs = [];
  }

  getFlowSummary(): {
    steps: DebugStep[];
    errors: DebugLogEntry[];
    warnings: DebugLogEntry[];
    lastStep: DebugStep | null;
  } {
    return {
      steps: this.logs.map(log => log.step),
      errors: this.logs.filter(log => log.level === 'error'),
      warnings: this.logs.filter(log => log.level === 'warn'),
      lastStep: this.logs.length > 0 ? (this.logs.at(-1)?.step ?? null) : null,
    };
  }
}

// Singleton instance
export const gistDebugLogger = new GistDebugLogger();

/**
 * Format error message with context
 */
export function formatGistError(
  step: DebugStep,
  baseMessage: string,
  context?: Record<string, unknown>
): string {
  const stepNames: Record<DebugStep, string> = {
    init: 'Initialisation',
    parse_identifier: "Analyse de l'identifiant",
    validate_input: 'Validation des entrées',
    validate_token: 'Validation du token',
    fetch_raw_url: 'Récupération via URL directe',
    fetch_api: 'Récupération via API GitHub',
    parse_response: 'Analyse de la réponse',
    find_file: 'Recherche du fichier',
    parse_json: 'Analyse du JSON',
    validate_flashcards: 'Validation des flashcards',
    convert_format: 'Conversion du format',
    create_gist: 'Création du Gist',
    update_gist: 'Mise à jour du Gist',
    build_url: "Construction de l'URL",
    complete: 'Terminé',
    error: 'Erreur',
  };

  const stepName = stepNames[step] || step;
  let message = `[${stepName}] ${baseMessage}`;

  if (context) {
    const contextParts: string[] = [];
    const safeString = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        return String(value);
      }
      try {
        return JSON.stringify(value);
      } catch {
        return '[Unable to stringify]';
      }
    };

    if (context.gistId !== undefined && context.gistId !== null) {
      contextParts.push(`Gist ID: ${safeString(context.gistId)}`);
    }
    if (context.owner !== undefined && context.owner !== null) {
      contextParts.push(`Propriétaire: ${safeString(context.owner)}`);
    }
    if (context.statusCode !== undefined && context.statusCode !== null) {
      contextParts.push(`Code HTTP: ${safeString(context.statusCode)}`);
    }
    if (context.fileName !== undefined && context.fileName !== null) {
      contextParts.push(`Fichier: ${safeString(context.fileName)}`);
    }
    if (context.flashcardsCount !== undefined) {
      contextParts.push(
        `Flashcards trouvées: ${safeString(context.flashcardsCount)}`
      );
    }

    if (contextParts.length > 0) {
      message += ` (${contextParts.join(', ')})`;
    }
  }

  return message;
}

/**
 * Create a detailed error context object
 */
export function createErrorContext(
  step: DebugStep,
  additionalData?: Record<string, unknown>
): Record<string, unknown> {
  return {
    step,
    timestamp: Date.now(),
    ...additionalData,
  };
}

/**
 * Safe JSON stringify for debug logging
 */
export function safeStringify(obj: unknown, maxLength = 1000): string {
  try {
    const str = JSON.stringify(obj, null, 2);
    if (str.length > maxLength) {
      return str.substring(0, maxLength) + '... (truncated)';
    }
    return str;
  } catch {
    return '[Unable to stringify]';
  }
}
