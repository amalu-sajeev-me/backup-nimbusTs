import { singleton, inject } from 'tsyringe';
import {
  BackupProvider,
  BackupOptions,
  BackupResult,
  BackupInfo,
  RestoreOptions,
  RestoreResult,
} from './backup.provider';
import { CommandService } from '../../command/command.service';
import { ConfigService } from '../../config/config.service';
import { S3StorageService } from '../../storage/providers/s3.storage.provider';
import path from 'path';
import fs from 'fs';
import { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { configSchema } from '../../config/config.schema';
import { z } from 'zod';
import { ConfigurationError, BackupError } from '../../error';
import { Logger } from '../../utils/logger/logger';

@singleton()
class MongoBackupProvider extends BackupProvider {
  private readonly tempDir = '/tmp';

  constructor(
    @inject(CommandService) private readonly commandService: CommandService,
    @inject(ConfigService)
    private readonly configService: ConfigService<z.infer<typeof configSchema>>,
    @inject(S3StorageService) private readonly storageService: S3StorageService,
    @inject(Logger) private readonly logger: Logger,
  ) {
    super();
    try {
      // Create temp directory if it doesn't exist
      if (!fs.existsSync(this.tempDir)) {
        this.logger.debug(`Creating temp directory: ${this.tempDir}`, 'MongoBackupProvider');
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
    } catch (error) {
      this.logger.error(
        `Failed to create temporary directory: ${this.tempDir}`,
        'MongoBackupProvider',
        error,
      );
      throw new ConfigurationError(`Failed to create temporary directory: ${this.tempDir}`, {
        cause: error,
      });
    }
  }

  async createBackup(options: BackupOptions = {}): Promise<BackupResult> {
    try {
      const timestamp = options.timestamp ?? new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = options.name ?? `mongodb-backup-${timestamp}`;
      const backupPath = path.join(this.tempDir, backupName);

      this.logger.info('Starting MongoDB backup', 'MongoBackupProvider', { backupName, timestamp });

      const decodedMongoUri = this.decodeMongoUri();
      await this.createMongoDump(decodedMongoUri, backupPath);

      this.logger.info('MongoDB dump created successfully', 'MongoBackupProvider', { backupPath });

      const finalBackupPath = await this.compressBackupIfNeeded(backupPath, options.compress);
      this.logger.info('Backup processed', 'MongoBackupProvider', {
        compressed: options.compress !== false,
        finalPath: finalBackupPath,
      });

      const backupResult = await this.uploadBackupToS3(finalBackupPath, options.compress);
      this.logger.info('Backup uploaded to S3', 'MongoBackupProvider', {
        s3Key: backupResult.s3Key,
        size: backupResult.size,
      });

      this.cleanupTemporaryFiles(backupPath, finalBackupPath, options.compress);

      return {
        success: true,
        backupId: backupResult.s3Key,
        timestamp,
        size: backupResult.size,
        location: backupResult.location,
      };
    } catch (error) {
      return this.handleBackupError(error);
    }
  }

  private decodeMongoUri(): string {
    this.logger.debug('Decoding MongoDB URI', 'MongoBackupProvider');
    const mongoUri = this.configService.get('MONGO_URI');
    if (!mongoUri) {
      this.logger.error('MongoDB URI is not configured', 'MongoBackupProvider');
      throw new ConfigurationError('MongoDB URI is not configured');
    }
    return Buffer.from(mongoUri, 'base64').toString();
  }

  private async createMongoDump(decodedMongoUri: string, backupPath: string): Promise<void> {
    this.logger.info('Executing mongodump', 'MongoBackupProvider', { outputPath: backupPath });

    const result = await this.commandService.execute('mongodump', [
      `--uri=${decodedMongoUri}`,
      `--out=${backupPath}`,
    ]);

    if (!fs.existsSync(backupPath) || fs.readdirSync(backupPath).length === 0) {
      this.logger.error('MongoDB backup failed', 'MongoBackupProvider', undefined, {
        stderr: result.stderr,
      });
      throw new BackupError(`MongoDB backup failed: ${result.stderr}`);
    }
  }

  private async compressBackupIfNeeded(
    backupPath: string,
    compress: boolean | undefined,
  ): Promise<string> {
    if (compress === false) {
      this.logger.info('Skipping compression as requested', 'MongoBackupProvider');
      return backupPath;
    }

    this.logger.info('Compressing backup', 'MongoBackupProvider', {
      source: backupPath,
      target: `${backupPath}.tar.gz`,
    });

    const tarResult = await this.commandService.execute('tar', [
      '-czf',
      `${backupPath}.tar.gz`,
      '-C',
      path.dirname(backupPath),
      path.basename(backupPath),
    ]);

    if (!tarResult.success) {
      this.logger.error('Failed to compress backup', 'MongoBackupProvider', undefined, {
        stderr: tarResult.stderr,
      });
      throw new BackupError(`Failed to compress backup: ${tarResult.stderr}`);
    }

    return `${backupPath}.tar.gz`;
  }

  private async uploadBackupToS3(
    finalBackupPath: string,
    compress: boolean | undefined,
  ): Promise<{ s3Key: string; size: number; location: string }> {
    this.logger.info('Reading backup file for S3 upload', 'MongoBackupProvider', {
      path: finalBackupPath,
    });
    const backupFile = fs.readFileSync(finalBackupPath);
    const bucketName = this.configService.get('AWS_S3_BUCKET_NAME');

    if (!bucketName) {
      this.logger.error('S3 bucket name is not configured', 'MongoBackupProvider');
      throw new ConfigurationError('S3 bucket name is not configured');
    }

    const decodedBucketName = Buffer.from(bucketName, 'base64').toString();
    const s3Key = `backups/${path.basename(finalBackupPath)}`;

    this.logger.info('Preparing S3 upload', 'MongoBackupProvider', {
      bucket: decodedBucketName,
      key: s3Key,
      size: backupFile.length,
    });

    const s3Params: PutObjectCommandInput = {
      Bucket: decodedBucketName,
      Key: s3Key,
      Body: backupFile,
      ContentType: compress !== false ? 'application/gzip' : 'application/octet-stream',
    };

    await this.storageService.save(s3Params);

    return {
      s3Key,
      size: backupFile.length,
      location: `s3://${decodedBucketName}/${s3Key}`,
    };
  }

  private cleanupTemporaryFiles(
    backupPath: string,
    finalBackupPath: string,
    compress: boolean | undefined,
  ): void {
    try {
      this.logger.info('Cleaning up temporary files', 'MongoBackupProvider');

      if (compress !== false) {
        this.logger.debug('Removing uncompressed backup directory', 'MongoBackupProvider', {
          path: backupPath,
        });
        fs.rmSync(backupPath, { recursive: true, force: true });
      }

      this.logger.debug('Removing backup file', 'MongoBackupProvider', { path: finalBackupPath });
      fs.rmSync(finalBackupPath, { force: true });

      this.logger.info('Temporary files cleaned up successfully', 'MongoBackupProvider');
    } catch (cleanupError) {
      this.logger.warn('Failed to clean up temporary files', 'MongoBackupProvider', { error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError) });
    }
  }

  private handleBackupError(error: unknown): BackupResult {
    this.logger.error('Error during backup process', 'MongoBackupProvider', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during backup';
    return {
      success: false,
      backupId: '',
      timestamp: new Date().toISOString(),
      error: errorMessage,
    };
  }

  async listBackups(): Promise<BackupInfo[]> {
    this.logger.info('Listing backups (not implemented)', 'MongoBackupProvider');
    return [];
  }

  async restoreBackup(id: string, _options?: RestoreOptions): Promise<RestoreResult> {
    this.logger.info('Restore backup requested (not implemented)', 'MongoBackupProvider', {
      backupId: id,
    });
    return {
      success: false,
      backupId: id,
      timestamp: new Date().toISOString(),
      error: 'Restore functionality not implemented yet',
    };
  }
}

export { MongoBackupProvider };
