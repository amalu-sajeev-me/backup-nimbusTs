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

@singleton()
class MongoBackupProvider extends BackupProvider {
  private readonly tempDir = '/tmp';
  
  constructor(
    @inject(CommandService) private readonly commandService: CommandService,
    @inject(ConfigService) private readonly configService: ConfigService<z.infer<typeof configSchema>>,
    @inject(S3StorageService) private readonly storageService: S3StorageService
  ) {
    super();
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async createBackup(options: BackupOptions = {}): Promise<BackupResult> {
    try {
      const timestamp = options.timestamp ?? new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = options.name ?? `mongodb-backup-${timestamp}`;
      const backupPath = path.join(this.tempDir, backupName);
      const mongoUri = this.configService.get('MONGO_URI');
      console.log('Mongo URI:', mongoUri);
      if (!mongoUri) {
        throw new Error('MongoDB URI is not configured');
      }
      
      // Decode base64 encoded MongoDB URI
      const decodedMongoUri = Buffer.from(mongoUri, 'base64').toString();
      
      // Create backup using mongodump
      const result = await this.commandService.execute('mongodump', [
        `--uri=${decodedMongoUri}`,
        `--out=${backupPath}`
      ]);
      
      // Instead of only checking result.success, check if directory was created
      // mongodump may return non-zero exit code even when it successfully dumps data
      if (!fs.existsSync(backupPath) || fs.readdirSync(backupPath).length === 0) {
        return {
          success: false,
          backupId: '',
          timestamp,
          error: `MongoDB backup failed: ${result.stderr}`
        };
      }
      
      console.log('Backup created at:', backupPath);
      console.log('Compressing backup...');
      // Compress backup if requested
      let finalBackupPath = backupPath;
      if (options.compress !== false) {
        const tarResult = await this.commandService.execute('tar', [
          '-czf', 
          `${backupPath}.tar.gz`,
          '-C', 
          path.dirname(backupPath),
          path.basename(backupPath)
        ]);
        
        if (!tarResult.success) {
          return {
            success: false,
            backupId: '',
            timestamp,
            error: `Failed to compress backup: ${tarResult.stderr}`
          };
        }
        
        finalBackupPath = `${backupPath}.tar.gz`;
      }
      
      // Upload to S3
      const backupFile = fs.readFileSync(finalBackupPath);
      const bucketName = this.configService.get('AWS_S3_BUCKET_NAME');
      
      if (!bucketName) {
        throw new Error('S3 bucket name is not configured');
      }
      
      // Decode base64 encoded bucket name
      const decodedBucketName = Buffer.from(bucketName, 'base64').toString();
      console.log(`Using S3 bucket: ${decodedBucketName}`);
      
      const s3Key = `backups/${path.basename(finalBackupPath)}`;
      const s3Params: PutObjectCommandInput = {
        Bucket: decodedBucketName,
        Key: s3Key,
        Body: backupFile,
        ContentType: options.compress !== false ? 'application/gzip' : 'application/octet-stream'
      };
      
      try {
        console.log(`Uploading backup to S3 (size: ${backupFile.length} bytes)...`);
        const s3Response = await this.storageService.save(s3Params);
        console.log(`S3 upload successful: ${JSON.stringify(s3Response)}`);
        
        // Only clean up files after successful upload
        try {
          console.log('Cleaning up temporary files...');
          if (options.compress !== false) {
            fs.rmSync(backupPath, { recursive: true, force: true });
          }
          fs.rmSync(finalBackupPath, { force: true });
          console.log('Temporary files cleaned up successfully');
        } catch (cleanupError) {
          console.warn('Warning: Failed to clean up temporary files', cleanupError);
        }
        
        return {
          success: true,
          backupId: s3Key,
          timestamp,
          size: backupFile.length,
          location: `s3://${decodedBucketName}/${s3Key}`
        };
      } catch (s3Error) {
        console.error('Error uploading to S3:', s3Error);
        // Return partial success - backup was created but not uploaded
        return {
          success: false,
          backupId: '',
          timestamp,
          error: `MongoDB backup was successful but S3 upload failed: ${s3Error instanceof Error ? s3Error.message : String(s3Error)}`
        };
      }
    } catch (error) {
      console.error('Error during backup:', error);
      return {
        success: false,
        backupId: '',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error during backup'
      };
    }
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