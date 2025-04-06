import { singleton, inject } from 'tsyringe';
import { SESNotificationProvider } from './providers/ses.notification.provider';
import { NotificationOptions, NotificationResult } from './providers/notification.provider';
import { Logger } from '../utils/logger/logger';
import { ConfigService } from '../config/config.service';

@singleton()
class NotificationService {
  constructor(
    @inject(SESNotificationProvider) private readonly notificationProvider: SESNotificationProvider,
    @inject(Logger) private readonly logger: Logger,
    @inject(ConfigService) private readonly configService: ConfigService
  ) {}
  
  isEnabled(): boolean {
    const notificationsEnabled = this.configService.get('NOTIFICATIONS_ENABLED');
    return notificationsEnabled !== 'false';
  }

  async sendNotification(options: NotificationOptions): Promise<NotificationResult> {
    // Check if notifications are enabled
    if (!this.isEnabled()) {
      this.logger.info('Notifications are disabled, skipping', 'NotificationService');
      return {
        success: true,
        messageId: 'notification-disabled',
        timestamp: new Date().toISOString()
      };
    }
    
    this.logger.info('Sending notification', 'NotificationService', { 
      subject: options.subject,
      recipientCount: options.recipients.length 
    });
    
    return this.notificationProvider.send(options);
  }
  
  async sendBackupSuccessNotification(backupDetails: {
    backupId: string;
    timestamp: string;
    size?: number;
    location?: string;
  }): Promise<NotificationResult> {
    this.logger.info('Sending backup success notification', 'NotificationService', backupDetails);
    
    const recipients = this.getNotificationRecipients();
    const subject = `Backup Successful: ${backupDetails.backupId}`;
    const message = this.buildBackupSuccessMessage(backupDetails);
    const html = this.buildBackupSuccessHtml(backupDetails);
    
    return this.sendNotification({
      subject,
      message,
      html,
      recipients
    });
  }
  
  async sendBackupFailureNotification(error: string, details?: Record<string, unknown>): Promise<NotificationResult> {
    this.logger.info('Sending backup failure notification', 'NotificationService', { error, details });
    
    const recipients = this.getNotificationRecipients();
    const subject = 'Backup Failed';
    const message = this.buildBackupFailureMessage(error, details);
    const html = this.buildBackupFailureHtml(error, details);
    
    return this.sendNotification({
      subject,
      message,
      html,
      recipients
    });
  }
  
  private getNotificationRecipients(): string[] {
    const recipientsString = this.configService.get('NOTIFICATION_RECIPIENTS');
    if (!recipientsString) {
      this.logger.warn('No notification recipients configured, using default email', 'NotificationService');
      return ['admin@example.com']; // Default fallback
    }
    
    try {
      // Decode base64
      const decodedRecipients = Buffer.from(recipientsString, 'base64').toString();
      // Split by comma
      return decodedRecipients.split(',').map(email => email.trim());
    } catch (error) {
      this.logger.error('Failed to parse notification recipients', 'NotificationService', error);
      return ['admin@example.com']; // Default fallback
    }
  }
  
  private buildBackupSuccessMessage(backupDetails: {
    backupId: string;
    timestamp: string;
    size?: number;
    location?: string;
  }): string {
    return `
Backup completed successfully

Backup ID: ${backupDetails.backupId}
Timestamp: ${backupDetails.timestamp}
Size: ${backupDetails.size ? `${(backupDetails.size / (1024 * 1024)).toFixed(2)} MB` : 'Unknown'}
Location: ${backupDetails.location ?? 'Unknown'}

This is an automated message from BackupNimbus.
    `.trim();
  }
  
  private buildBackupSuccessHtml(backupDetails: {
    backupId: string;
    timestamp: string;
    size?: number;
    location?: string;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4CAF50; color: white; padding: 10px; text-align: center; }
    .content { padding: 20px; border: 1px solid #ddd; }
    .footer { font-size: 12px; color: #777; margin-top: 20px; text-align: center; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Backup Completed Successfully</h2>
    </div>
    <div class="content">
      <p>The MongoDB backup has been successfully completed and stored in AWS S3.</p>
      
      <table>
        <tr>
          <th>Property</th>
          <th>Value</th>
        </tr>
        <tr>
          <td>Backup ID</td>
          <td>${backupDetails.backupId}</td>
        </tr>
        <tr>
          <td>Timestamp</td>
          <td>${backupDetails.timestamp}</td>
        </tr>
        <tr>
          <td>Size</td>
          <td>${backupDetails.size ? `${(backupDetails.size / (1024 * 1024)).toFixed(2)} MB` : 'Unknown'}</td>
        </tr>
        <tr>
          <td>Location</td>
          <td>${backupDetails.location ?? 'Unknown'}</td>
        </tr>
      </table>
    </div>
    <div class="footer">
      <p>This is an automated message from BackupNimbus. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
  
  private buildBackupFailureMessage(error: string, details?: Record<string, unknown>): string {
    return `
Backup Failed

Error: ${error}
Timestamp: ${new Date().toISOString()}
${details ? `Details: ${JSON.stringify(details, null, 2)}` : ''}

This is an automated message from BackupNimbus.
    `.trim();
  }
  
  private buildBackupFailureHtml(error: string, details?: Record<string, unknown>): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f44336; color: white; padding: 10px; text-align: center; }
    .content { padding: 20px; border: 1px solid #ddd; }
    .footer { font-size: 12px; color: #777; margin-top: 20px; text-align: center; }
    .error { color: #f44336; font-weight: bold; }
    pre { background-color: #f5f5f5; padding: 10px; overflow: auto; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Backup Failed</h2>
    </div>
    <div class="content">
      <p>The MongoDB backup operation has failed.</p>
      
      <p><span class="error">Error:</span> ${error}</p>
      <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      
      ${details ? `
      <p><strong>Details:</strong></p>
      <pre>${JSON.stringify(details, null, 2)}</pre>
      ` : ''}
      
      <p>Please check the logs for more information and take appropriate action.</p>
    </div>
    <div class="footer">
      <p>This is an automated message from BackupNimbus. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}

export { NotificationService };