import { z } from "zod";

const configSchema = z.object({
    MONGO_URI: z.string().base64(),
    AWS_S3_BUCKET_NAME: z.string().base64(),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export { configSchema };