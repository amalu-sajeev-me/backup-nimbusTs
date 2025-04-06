import { singleton, inject } from 'tsyringe';
import { StorageProvider } from './storage.provider';
import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandOutput,
  DeleteObjectCommand,
  PutObjectCommandInput,
  DeleteObjectCommandInput,
  DeleteObjectCommandOutput,
  S3ClientConfig,
} from '@aws-sdk/client-s3';
import { ConfigService } from '../../config/config.service';
import { configSchema } from '../../config/config.schema';
import { z } from 'zod';
import { StorageError } from '../../error';
import { Logger } from '../../utils/logger/logger';

@singleton()
class S3StorageService extends StorageProvider {
  private readonly S3: S3Client;

  constructor(
    @inject(ConfigService)
    private readonly configService: ConfigService<z.infer<typeof configSchema>>,
    @inject(Logger) private readonly logger: Logger,
  ) {
    super();
    // Explicitly configure region - use environment AWS_REGION if available or default to us-east-1
    const region = configService.get('AWS_REGION') ?? 'us-east-1';
    const NODE_ENV = configService.get('NODE_ENV') ?? 'development';

    const s3DefaultConfig: S3ClientConfig =
      NODE_ENV === 'development'
        ? {
            region,
            credentials: {
              accessKeyId: configService.get('AWS_ACCESS_KEY_ID') ?? '',
              secretAccessKey: configService.get('AWS_SECRET_ACCESS_KEY') ?? '',
            },
          }
        : {};
    this.logger.info(`Initializing S3 client with region: ${region}`, 'S3StorageService');

    this.S3 = new S3Client({
      ...s3DefaultConfig,
      region,
      // Make SDK return detailed errors
      retryMode: 'standard', // Enable automatic retries
      maxAttempts: 3, // Retry up to 3 times
    });
  }

  async save<TInput = PutObjectCommandInput, TResult = PutObjectCommandOutput>(
    data: TInput,
  ): Promise<TResult> {
    try {
      const bucket = (data as PutObjectCommandInput).Bucket;
      const key = (data as PutObjectCommandInput).Key;

      this.logger.info(`Uploading to S3 bucket: ${bucket}, key: ${key}`, 'S3StorageService');
      const command = new PutObjectCommand(data as PutObjectCommandInput);
      const response = await this.S3.send(command);
      this.logger.debug('S3 upload successful', 'S3StorageService', { response });
      return response as TResult;
    } catch (error) {
      this.logger.error('Error saving data to S3', 'S3StorageService', error, {
        bucket: (data as PutObjectCommandInput).Bucket,
        key: (data as PutObjectCommandInput).Key,
      });

      throw new StorageError(
        `Failed to save data to S3: ${error instanceof Error ? error.message : String(error)}`,
        {
          details: {
            bucket: (data as PutObjectCommandInput).Bucket,
            key: (data as PutObjectCommandInput).Key,
          },
          cause: error,
        },
      );
    }
  }

  async delete<TInput = DeleteObjectCommandInput, TResult = DeleteObjectCommandOutput>(
    options: TInput,
  ): Promise<TResult> {
    try {
      const bucket = (options as DeleteObjectCommandInput).Bucket;
      const key = (options as DeleteObjectCommandInput).Key;

      this.logger.info(`Deleting from S3 bucket: ${bucket}, key: ${key}`, 'S3StorageService');
      const command = new DeleteObjectCommand(options as DeleteObjectCommandInput);
      const result = await this.S3.send(command);
      this.logger.debug('S3 delete successful', 'S3StorageService', { result });
      return result as TResult;
    } catch (error) {
      this.logger.error('Error deleting data from S3', 'S3StorageService', error, {
        bucket: (options as DeleteObjectCommandInput).Bucket,
        key: (options as DeleteObjectCommandInput).Key,
      });

      throw new StorageError(
        `Failed to delete data from S3: ${error instanceof Error ? error.message : String(error)}`,
        {
          details: {
            bucket: (options as DeleteObjectCommandInput).Bucket,
            key: (options as DeleteObjectCommandInput).Key,
          },
          cause: error,
        },
      );
    }
  }
}

export { S3StorageService };
