import { singleton, inject } from 'tsyringe';
import { MongoBackupProvider } from './providers/mongo.backup.provider';
import { BackupOptions, BackupResult, BackupInfo, RestoreOptions, RestoreResult } from './providers/backup.provider';

@singleton()
class BackupService {
  constructor(@inject(MongoBackupProvider) private backupProvider: MongoBackupProvider) {}

  async createBackup(options?: BackupOptions): Promise<BackupResult> {
    return this.backupProvider.createBackup(options || {});
  }

  async listBackups(): Promise<BackupInfo[]> {
    return this.backupProvider.listBackups();
  }

  async restoreBackup(id: string, options?: RestoreOptions): Promise<RestoreResult> {
    return this.backupProvider.restoreBackup(id, options);
  }
}

export { BackupService };