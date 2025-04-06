# BackupNimbus

<img src="https://github.com/user-attachments/assets/10d9e940-3933-4781-acee-81181e1995f6" alt="Alt text" width="300" height="300"/>

BackupNimbus is a fully automated, AWS-native backup system designed to protect and preserve your MongoDB Atlas data with zero human intervention. Built with TypeScript, Node.js, AWS Lambda, Docker, and EventBridge, this serverless solution performs daily encrypted backups using `mongodump`, stores them in Amazon S3, and secures credentials via base64 encoding — all without relying on external cron jobs or third-party infrastructure.

## Features

- **Fully Automated**: Scheduled backups with AWS EventBridge  
- **Secure**: Base64 encoded environment variables for sensitive data  
- **Flexible**: Pluggable architecture using SOLID principles and Dependency Injection (`tsyringe`)  
- **Type-Safe**: Built with TypeScript for enhanced developer experience and runtime safety  
- **Reliable**: Error handling, retries, and detailed logging  
- **Scalable**: Serverless design with AWS Lambda  
- **Containerized**: Docker support for easy deployment  
- **Configurable**: Validate configuration with Zod schema validation  
- **Extensible**: Plugin system for adding custom providers without modifying core code  
- **Comprehensive Logging**: Centralized logging with configurable log levels  
- **Error Handling**: Standardized error handling with appropriate HTTP status codes  
- **Notifications**: Email notifications for backup success/failure via AWS SES  

## Architecture

BackupNimbus follows clean architecture principles with a focus on modularity and testability:

```
BackupNimbus/
├── src/
│   ├── backup/                 # Backup domain
│   │   ├── providers/          # Different backup implementations
│   │   │   ├── backup.provider.ts       # Abstract backup provider
│   │   │   └── mongo.backup.provider.ts # MongoDB implementation
│   │   └── backup.service.ts   # Main backup orchestration
│   ├── command/                # Command execution domain
│   │   ├── providers/          # Command execution implementations
│   │   │   ├── command.provider.ts     # Abstract command provider
│   │   │   └── shell.command.provider.ts # Shell command implementation
│   │   └── command.service.ts  # Command service
│   ├── config/                 # Configuration handling
│   │   ├── providers/          # Configuration source implementations
│   │   │   └── config.provider.ts   # Abstract configuration provider
│   │   ├── config.schema.ts    # Zod schema for configuration validation
│   │   └── config.service.ts   # Configuration service
│   ├── error/                  # Error handling
│   │   ├── application-error.ts # Base error class
│   │   ├── specific-errors.ts  # Domain-specific errors
│   │   └── error-handler.ts    # Centralized error handler
│   ├── notification/           # Notification system
│   │   ├── providers/          # Notification implementations
│   │   │   ├── notification.provider.ts # Abstract notification provider
│   │   │   └── ses.notification.provider.ts # AWS SES implementation
│   │   └── notification.service.ts # Notification service
│   ├── plugin/                 # Plugin system
│   │   ├── plugin.interface.ts # Plugin interfaces and base classes
│   │   └── plugin-registry.ts  # Plugin registration and management
│   ├── services/               # Application services
│   │   └── handler.service.ts  # Lambda handler service
│   ├── storage/                # Storage domain
│   │   └── providers/          # Storage implementations
│   │       ├── storage.provider.ts    # Abstract storage provider
│   │       └── s3.storage.provider.ts # S3 implementation
│   ├── utils/                  # Utilities
│   │   └── logger/             # Logging system
│   │       └── logger.ts       # Centralized logger
│   ├── handler.ts              # AWS Lambda handler
│   └── index.ts                # Main application entry point
```

### Key Components

- **Backup Providers**: Abstract backup creation (MongoDB implementation)  
- **Command Providers**: Abstract command execution (Shell implementation)  
- **Storage Providers**: Abstract backup storage (S3 implementation)  
- **Config Providers**: Abstract configuration retrieval (Environment implementation)  
- **Notification Providers**: Abstract notification delivery (AWS SES implementation)  
- **Plugin System**: Register, initialize, and manage custom extensions  
- **Error Handling**: Standardized error classes with HTTP status codes  
- **Logging System**: Centralized logger with context and log levels  

## Installation

### Prerequisites

- Node.js 18+  
- MongoDB database tools (`mongodump`)  
- AWS account with S3 bucket  
- TypeScript 5.8+  

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/BackupNimbus.git
cd BackupNimbus

# Install dependencies
npm install

# Create .env file with your credentials (base64 encoded)
cp .env.example .env
# Edit .env file with your credentials

# Build TypeScript code
npm run build

# Run locally
npm start

# For development with auto-reload
npm run start:dev
```

### Docker Deployment

```bash
# Build Docker image
docker build -t backupnimbus .

# Run container
docker run --env-file .env backupnimbus
```

### AWS Lambda Deployment

```bash
# Build Docker image
docker build -t backupnimbus .

# Push to AWS ECR
aws ecr get-login-password --region your-region | docker login --username AWS --password-stdin your-account-id.dkr.ecr.your-region.amazonaws.com
docker tag backupnimbus:latest your-account-id.dkr.ecr.your-region.amazonaws.com/backupnimbus:latest
docker push your-account-id.dkr.ecr.your-region.amazonaws.com/backupnimbus:latest

# Create Lambda function using the ECR image
# Set up EventBridge rule for scheduling
```

## Configuration

BackupNimbus uses the following environment variables, validated with Zod:

| Variable                  | Description                              | Required | Format          |
|---------------------------|------------------------------------------|----------|-----------------|
| `MONGO_URI`               | MongoDB connection string               | Yes      | Base64 encoded  |
| `AWS_S3_BUCKET_NAME`      | S3 bucket name for storing backups      | Yes      | Base64 encoded  |
| `AWS_ACCESS_KEY_ID`       | AWS access key                          | Yes      | Base64 encoded  |
| `AWS_SECRET_ACCESS_KEY`   | AWS secret access key                   | Yes      | Base64 encoded  |
| `AWS_REGION`              | AWS region                              | No       | Plain text      |
| `NODE_ENV`                | Environment ('development', 'production', 'test') | No | Plain text      |
| `LOG_LEVEL`               | Log level ('DEBUG', 'INFO', 'WARN', 'ERROR') | No | Plain text      |
| `NOTIFICATION_SENDER_EMAIL` | Email address used to send notifications | No | Base64 encoded  |
| `NOTIFICATION_RECIPIENTS` | Comma-separated list of recipient emails | No      | Base64 encoded  |
| `NOTIFICATIONS_ENABLED`   | Enable/disable notifications ('true', 'false') | No | Plain text      |

## Usage

### Basic Usage

Once deployed, BackupNimbus will automatically create backups according to the configured schedule.

### Customizing Backups

You can customize the backup process by modifying options when creating a backup:

```typescript
import { container } from 'tsyringe';
import { BackupService } from './backup/backup.service';

const backupService = container.resolve(BackupService);
await backupService.createBackup({
  name: 'custom-backup-name',
  compress: true,
  timestamp: new Date().toISOString()
});
```

### Manual Triggering

You can manually trigger a backup by invoking the Lambda function:

```bash
aws lambda invoke --function-name BackupNimbus output.json
```

## Development

### Code Structure

The project uses dependency injection with `tsyringe` to maintain clean separation of concerns:

```typescript
@singleton()
class BackupService {
  constructor(@inject(MongoBackupProvider) private backupProvider: MongoBackupProvider) {}

  async createBackup(options?: BackupOptions): Promise<BackupResult> {
    return this.backupProvider.createBackup(options || {});
  }
}
```

### Adding Support for New Databases

Create a new provider that implements the `BackupProvider` abstract class:

```typescript
@singleton()
class PostgresBackupProvider extends BackupProvider {
  // Implement abstract methods
}

// Register in container
container.register(BackupProvider, { useClass: PostgresBackupProvider });
```

## Error Handling

BackupNimbus uses a centralized error handling system with standardized HTTP status codes:

```typescript
// Example of using the error system
try {
  // Some operation
} catch (error) {
  // Domain-specific errors
  throw new BackupError('Failed to create backup', {
    details: { originalError: error }
  });
}
```

Error responses follow this format:

```json
{
  "error": {
    "code": "BACKUP_ERROR",
    "message": "Failed to create backup",
    "timestamp": "2025-04-07T10:15:30.123Z",
    "details": {
      "originalError": "..."
    }
  }
}
```

## Logging System

BackupNimbus includes a centralized logging system with configurable levels:

```typescript
// Injected in your class constructor
constructor(@inject(Logger) private logger: Logger) {}

// Usage
logger.debug('Detailed debug information', 'ComponentName', { additionalData: 'value' });
logger.info('Operation successful', 'ComponentName');
logger.warn('Something might be wrong', 'ComponentName', { warning: 'details' });
logger.error('Operation failed', 'ComponentName', error, { context: 'details' });
```

Logs include timestamps, levels, context, and structured data for easy filtering and analysis.

## Notifications

BackupNimbus can send email notifications for backup success and failure:

- Enable notifications in your `.env` file:
  ```env
  NOTIFICATIONS_ENABLED=true
  NOTIFICATION_SENDER_EMAIL=base64_encoded_email
  NOTIFICATION_RECIPIENTS=base64_encoded_comma_separated_emails
  ```

- The notification service will automatically send emails when backups succeed or fail with detailed information about the operation.

### Customizing Notifications

You can send custom notifications:

```typescript
import { container } from 'tsyringe';
import { NotificationService } from 'backupnimbusts';

const notificationService = container.resolve(NotificationService);
await notificationService.sendNotification({
  subject: 'Custom Notification',
  message: 'This is a test message',
  html: '<p>This is a <strong>HTML</strong> message</p>',
  recipients: ['user@example.com']
});
```

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Author

Amalu Sajeev

## Acknowledgments

- MongoDB Atlas for providing a reliable database service  
- AWS for their serverless infrastructure  
- TypeScript and Node.js communities for all the amazing tools and libraries  
