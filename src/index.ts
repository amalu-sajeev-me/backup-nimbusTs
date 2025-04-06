import { handler } from './handler';

export { handler } from './handler';

if (process.env.NODE_ENV !== 'production') {
  handler();
}
