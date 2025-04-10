import { z } from "zod";

const configSchema = z.object({
    MONGO_URI: z.string().base64(),
    AWS_S3_BUCKET_NAME: z.string().base64(),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    AWS_REGION: z.string().optional().default('us-east-1'),
    AWS_ACCESS_KEY_ID: z.string().base64(),
    AWS_SECRET_ACCESS_KEY: z.string().base64(),
    LOG_LEVEL: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).optional().default('INFO'),
    NOTIFICATION_SENDER_EMAIL: z.string().base64().optional(),
    NOTIFICATION_RECIPIENTS: z.string().base64().optional(),
    NOTIFICATIONS_ENABLED: z.enum(['true', 'false']).optional().default('false'),
});

export { configSchema };