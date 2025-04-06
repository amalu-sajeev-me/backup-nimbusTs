abstract class BackupProvider {
  abstract createBackup(options: BackupOptions): Promise<BackupResult>;
  abstract listBackups(): Promise<BackupInfo[]>;
  abstract restoreBackup(id: string, options?: RestoreOptions): Promise<RestoreResult>;
}

export interface BackupOptions {
  name?: string;
  timestamp?: string;
  destination?: string;
  compress?: boolean;
}

export interface BackupResult {
  success: boolean;
  backupId: string;
  timestamp: string;
  size?: number;
  location?: string;
  error?: string;
}

export interface BackupInfo {
  backupId: string;
  timestamp: string;
  size: number;
  name: string;
  location: string;
}

export interface RestoreOptions {
  targetLocation?: string;
}

export interface RestoreResult {
  success: boolean;
  backupId: string;
  timestamp: string;
  error?: string;
}

export { BackupProvider };