/**
 * @module Logger
 * @description Standardized logging utility for the application
 * Handles different environments and log levels with structured output
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMessage {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  component?: string;
}

interface LoggerConfig {
  level: LogLevel;
  persist?: boolean;
  enableConsole?: boolean;
}

const LOGGER_CONFIG_KEY = 'logger_config';

class Logger {
  private static instance: Logger;
  private readonly isProd: boolean;
  private logLevel: LogLevel;
  private enableConsole: boolean;
  private hasLocalStorage: boolean;

  private constructor() {
    this.isProd = process.env.NODE_ENV === 'production';
    this.hasLocalStorage = this.checkLocalStorage();
    
    // Try to load saved config
    const savedConfig = this.loadConfig();
    this.logLevel = savedConfig?.level || (this.isProd ? 'warn' : 'debug');
    this.enableConsole = savedConfig?.enableConsole ?? !this.isProd;
    
    if (this.isProd) {
      this.info('Logger initialized in production mode', { level: this.logLevel }, 'Logger');
    } else {
      this.debug('Logger initialized in development mode', { level: this.logLevel }, 'Logger');
    }
  }

  private checkLocalStorage(): boolean {
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      return true;
    } catch (e) {
      return false;
    }
  }

  private loadConfig(): LoggerConfig | null {
    if (!this.hasLocalStorage) return null;
    
    try {
      const saved = localStorage.getItem(LOGGER_CONFIG_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      // Fail silently and return null
      return null;
    }
  }

  private saveConfig(config: LoggerConfig) {
    if (!this.hasLocalStorage) return;
    
    try {
      if (config.persist) {
        localStorage.setItem(LOGGER_CONFIG_KEY, JSON.stringify(config));
      }
    } catch (error) {
      // Fail silently
    }
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatMessage(level: LogLevel, message: string, data?: any, component?: string): LogMessage {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      component
    };
  }

  private log(level: LogLevel, message: string, data?: any, component?: string) {
    if (!this.shouldLog(level) || !this.enableConsole) return;

    const logMessage = this.formatMessage(level, message, data, component);

    if (this.isProd) {
      // In production, only output to console if it's warn or error
      if (level === 'warn' || level === 'error') {
        console[level](JSON.stringify(logMessage));
      }
    } else {
      // In development, use formatted console output
      const style = {
        debug: 'color: #9B9B9B',
        info: 'color: #2196F3',
        warn: 'color: #FF9800',
        error: 'color: #F44336'
      };

      console[level](
        `%c[${logMessage.level.toUpperCase()}] ${logMessage.timestamp}${component ? ` [${component}]` : ''}: ${message}`,
        style[level],
        data || ''
      );
    }
  }

  /**
   * Configure logger settings at runtime
   * @param config Logger configuration options
   * @example
   * logger.configure({ level: 'debug', persist: true, enableConsole: true });
   */
  public configure(config: LoggerConfig) {
    this.logLevel = config.level;
    this.enableConsole = config.enableConsole ?? this.enableConsole;
    
    this.info('Logger configuration updated', { 
      level: this.logLevel, 
      enableConsole: this.enableConsole 
    }, 'Logger');
    
    if (this.hasLocalStorage) {
      this.saveConfig(config);
    }
  }

  /**
   * Get current logger configuration
   */
  public getConfig(): LoggerConfig {
    return {
      level: this.logLevel,
      enableConsole: this.enableConsole
    };
  }

  /**
   * Reset logger configuration to defaults
   * @param persist Whether to persist the reset configuration
   */
  public reset(persist: boolean = false) {
    const defaultConfig: LoggerConfig = {
      level: this.isProd ? 'warn' : 'debug',
      enableConsole: !this.isProd,
      persist
    };
    
    this.configure(defaultConfig);
    
    if (this.hasLocalStorage && !persist) {
      try {
        localStorage.removeItem(LOGGER_CONFIG_KEY);
      } catch (error) {
        // Fail silently
      }
    }
  }

  public debug(message: string, data?: any, component?: string) {
    this.log('debug', message, data, component);
  }

  public info(message: string, data?: any, component?: string) {
    this.log('info', message, data, component);
  }

  public warn(message: string, data?: any, component?: string) {
    this.log('warn', message, data, component);
  }

  public error(message: string, data?: any, component?: string) {
    this.log('error', message, data, component);
  }

  public trackPageView(pageName: string, timeSpentInSec?: number) {
    if (!this.isProd) return;
    
    this.info('Page View', {
      page: pageName,
      timeSpent: timeSpentInSec,
      timestamp: new Date().toISOString()
    }, 'Analytics');
  }
}

export const logger = Logger.getInstance(); 