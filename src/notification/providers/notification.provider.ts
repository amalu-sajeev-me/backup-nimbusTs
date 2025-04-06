export interface NotificationOptions {
  subject: string;
  message: string;
  html?: string;
  recipients: string[];
  cc?: string[];
  bcc?: string[];
  attachments?: NotificationAttachment[];
}

export interface NotificationAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: string;
}

abstract class NotificationProvider {
  abstract send(options: NotificationOptions): Promise<NotificationResult>;
}

export { NotificationProvider };