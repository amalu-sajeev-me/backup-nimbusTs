import 'dotenv/config';
import 'reflect-metadata';

import { handler } from './handler';
import { container } from 'tsyringe';
import { ConfigService } from './config/config.service';
import { z } from 'zod';
import { configSchema } from './config/config.schema';
import { Logger } from './utils/logger/logger';

const config = container.resolve(ConfigService<z.infer<typeof configSchema>>);
const logger = container.resolve(Logger);

const NODE_ENV = config.get('NODE_ENV');
logger.info(`Application starting in ${NODE_ENV} mode`, 'index');

if (NODE_ENV !== 'production') {
  handler();
}

export { handler } from './handler';