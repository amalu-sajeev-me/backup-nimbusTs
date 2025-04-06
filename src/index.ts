import 'dotenv/config';
import 'reflect-metadata';

import { handler } from './handler';
import { container } from 'tsyringe';
import { ConfigService } from './config/config.service';
import { z } from 'zod';
import { configSchema } from './config/config.schema';

const config = container.resolve(ConfigService<z.infer<typeof configSchema>>);

const NODE_ENV = config.get('NODE_ENV');

console.log('NODE_ENV:', NODE_ENV);

if (NODE_ENV !== 'production') {
  handler();
}

export { handler } from './handler';