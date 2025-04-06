import { singleton, inject } from 'tsyringe';
import { BackupProvider, BackupOptions, BackupResult, BackupInfo, RestoreOptions, RestoreResult } from './backup.provider';
import { CommandService } from '../../command/command.service';
import { ConfigService } from '../../config/config.service';
import { S3StorageService } from '../../storage/providers/s3.storage.provider';
import path from 'path';
import fs from 'fs';
import { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { configSchema } from '../../config/config.schema';
import { z } from 'zod';
import { ConfigurationError } from '../../error';

@singleton()
class MongoBackupProvider extends BackupProvider {
  private readonly tempDir = '/tmp';
  
  constructor(
    @inject(CommandService) private readonly commandService: CommandService,
    @inject(ConfigService) private readonly configService: ConfigService<z.infer<typeof configSchema>>,
    @inject(S3StorageService) private readonly storageService: S3StorageService
  ) {
    super();
    try {
      // Create temp directory if it doesn't exist
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
    } catch (error) {
      throw new ConfigurationError(`Failed to create temporary directory: ${this.tempDir}`, { cause: error });
    }
  }

  async createBackup(options: BackupOptions = {}): Promise<BackupResult> {
    try {
      const timestamp = options.timestamp ?? new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = options.name ?? `mongodb-backup-${timestamp}`;
      const backupPath = path.join(this.tempDir, backupName);

      const decodedMongoUri = this.decodeMongoUri();
      await this.createMongoDump(decodedMongoUri, backupPath);

      const finalBackupPath = await this.compressBackupIfNeeded(backupPath, options.compress);
      const backupResult = await this.uploadBackupToS3(finalBackupPath, options.compress);

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
    const mongoUri = this.configService.get('MONGO_URI');
    if (!mongoUri) {
      throw new ConfigurationError('MongoDB URI is not configured');
    }
    return Buffer.from(mongoUri, 'base64').toString();
  }

  private async createMongoDump(decodedMongoUri: string, backupPath: string): Promise<void> {
    const result = await this.commandService.execute('mongodump', [
      `--uri=${decodedMongoUri}`,
      `--out=${backupPath}`,
    ]);

    if (!fs.existsSync(backupPath) || fs.readdirSync(backupPath).length === 0) {
      throw new Error(`MongoDB backup failed: ${result.stderr}`);
    }
  }

  private async compressBackupIfNeeded(backupPath: string, compress: boolean | undefined): Promise<string> {
    if (compress === false) {
      return backupPath;
    }

    const tarResult = await this.commandService.execute('tar', [
      '-czf',
      `${backupPath}.tar.gz`,
      '-C',
      path.dirname(backupPath),
      path.basename(backupPath),
    ]);

    if (!tarResult.success) {
      throw new Error(`Failed to compress backup: ${tarResult.stderr}`);
    }

    return `${backupPath}.tar.gz`;
  }

  private async uploadBackupToS3(finalBackupPath: string, compress: boolean | undefined): Promise<{ s3Key: string; size: number; location: string }> {
    const backupFile = fs.readFileSync(finalBackupPath);
    const bucketName = this.configService.get('AWS_S3_BUCKET_NAME');

    if (!bucketName) {
      throw new Error('S3 bucket name is not configured');
    }

    const decodedBucketName = Buffer.from(bucketName, 'base64').toString();
    const s3Key = `backups/${path.basename(finalBackupPath)}`;
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

  private cleanupTemporaryFiles(backupPath: string, finalBackupPath: string, compress: boolean | undefined): void {
    try {
      if (compress !== false) {
        fs.rmSync(backupPath, { recursive: true, force: true });
      }
      fs.rmSync(finalBackupPath, { force: true });
    } catch (cleanupError) {
      console.warn('Warning: Failed to clean up temporary files', cleanupError);
    }
  }

  private handleBackupError(error: unknown): BackupResult {
    console.error('Error during backup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during backup';
    return {
      success: false,
      backupId: '',
      timestamp: new Date().toISOString(),
      error: errorMessage,
    };
  }
  
  async listBackups(): Promise<BackupInfo[]> {
    // This method would list backups from S3
    // For now, returning an empty array as implementation would require
    // additional AWS SDK methods not shown in the provided files
    return [];
  }
  
  async restoreBackup(id: string, _options?: RestoreOptions): Promise<RestoreResult> {
    // This method would restore a backup from S3
    // Implementation would require additional logic to download from S3
    // and restore using mongorestore
    return {
      success: false,
      backupId: id,
      timestamp: new Date().toISOString(),
      error: 'Restore functionality not implemented yet'
    };
  }
}

export { MongoBackupProvider };