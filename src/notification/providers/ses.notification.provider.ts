import { singleton, inject } from 'tsyringe';
import { SESClient, SendEmailCommand, SendEmailCommandInput } from '@aws-sdk/client-ses';
import { NotificationProvider, NotificationOptions, NotificationResult } from './notification.provider';
import { ConfigService } from '../../config/config.service';
import { configSchema } from '../../config/config.schema';
import { z } from 'zod';
import { Logger } from '../../utils/logger/logger';
import { NotificationError } from '../../error';

@singleton()
class SESNotificationProvider extends NotificationProvider {
  private readonly sesClient: SESClient;
  
  constructor(
    @inject(ConfigService) private readonly configService: ConfigService<z.infer<typeof configSchema>>,
    @inject(Logger) private readonly logger: Logger
  ) {
    super();
    const region = process.env.AWS_REGION ?? 'us-east-1';
    this.logger.info(`Initializing SES client with region: ${region}`, 'SESNotificationProvider');
    
    this.sesClient = new SESClient({
      region,
      maxAttempts: 3
    });
  }
  
  async send(options: NotificationOptions): Promise<NotificationResult> {
    try {
      this.logger.info('Preparing to send email notification', 'SESNotificationProvider', { 
        subject: options.subject,
        recipients: options.recipients.length
      });
      
      const senderEmail = this.getSenderEmail();
      const params = this.buildSESParams(senderEmail, options);
      
      this.logger.debug('Sending email via SES', 'SESNotificationProvider', { params });
      const command = new SendEmailCommand(params);
      const response = await this.sesClient.send(command);
      
      this.logger.info('Email sent successfully', 'SESNotificationProvider', { 
        messageId: response.MessageId 
      });
      
      return {
        success: true,
        messageId: response.MessageId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Failed to send email notification', 'SESNotificationProvider', error, {
        subject: options.subject,
        recipients: options.recipients
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }
  
  private getSenderEmail(): string {
    const senderEmail = this.configService.get('NOTIFICATION_SENDER_EMAIL');
    if (!senderEmail) {
      this.logger.error('Sender email is not configured', 'SESNotificationProvider');
      throw new NotificationError('Sender email is not configured');
    }
    
    return Buffer.from(senderEmail, 'base64').toString();
  }
  
  private buildSESParams(senderEmail: string, options: NotificationOptions): SendEmailCommandInput {
    return {
      Source: senderEmail,
      Destination: {
        ToAddresses: options.recipients,
        CcAddresses: options.cc,
        BccAddresses: options.bcc
      },
      Message: {
        Subject: {
          Data: options.subject,
          Charset: 'UTF-8'
        },
        Body: {
          Text: {
            Data: options.message,
            Charset: 'UTF-8'
          },
          ...(options.html && {
            Html: {
              Data: options.html,
              Charset: 'UTF-8'
            }
          })
        }
      }
      // Note: For attachments, we would need to use SendRawEmailCommand instead
    };
  }
}

export { SESNotificationProvider };