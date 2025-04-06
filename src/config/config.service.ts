import { singleton } from 'tsyringe';
import { configSchema } from './config.schema';
import { ConfigProvider } from './providers/config.provider';
import { z } from 'zod';
import { ApplicationError, ConfigurationError, ValidationError } from '../error';

@singleton()
class ConfigService<T extends object = z.infer<typeof configSchema>> extends ConfigProvider<T> {
  private config: T = {} as T;
  constructor() {
    super();
    this.validateConfig();
  }

  private validateConfig() {
    try {
      const { success, data, error } = configSchema.safeParse(process.env);
      if (!success) {
        throw new ValidationError(`Configuration validation failed: ${error}`, {
          details: { zodError: error }
        });
      }
      if (data) this.config = data as T;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw new ConfigurationError('Failed to validate configuration', { cause: error });
    }
  }

  get<K extends keyof T>(key: K): string | undefined {
    const value = this.config[key];
    return typeof value === 'string' ? value : undefined;
  }

  has<K extends keyof T>(key: K): boolean {
    return key in this.config;
  }
}

export { ConfigService };
