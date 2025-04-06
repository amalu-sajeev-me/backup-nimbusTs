import { singleton } from 'tsyringe';
import { configSchema } from './config.schema';
import { ConfigProvider } from './providers/config.provider';
import { z } from 'zod';

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
        throw new Error(`Configuration validation failed: ${error}`);
      }
      if (data) this.config = data as T;
    } catch (error) {
      console.error('Error validating configuration:', error);
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
