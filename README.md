# BackupNimbus

<img src="https://github.com/user-attachments/assets/10d9e940-3933-4781-acee-81181e1995f6" alt="Alt text" width="300" height="300"/>

BackupNimbus is a fully automated, AWS-native backup system designed to protect and preserve your MongoDB Atlas data with zero human intervention. Built with TypeScript, Node.js, AWS Lambda, Docker, and EventBridge, this serverless solution performs daily encrypted backups using `mongodump`, stores them in Amazon S3, and secures credentials via base64 encoding — all without relying on external cron jobs or third-party infrastructure.

## Features

- **Fully Automated**: Scheduled backups with AWS EventBridge  
- **Secure**: Base64 encoded environment variables for sensitive data  
- **Flexible**: Pluggable architecture using SOLID principles and Dependency Injection (tsyringe)
- **Type-Safe**: Built with TypeScript for enhanced developer experience and runtime safety
- **Reliable**: Error handling, retries, and detailed logging  
- **Scalable**: Serverless design with AWS Lambda  
- **Containerized**: Docker support for easy deployment  
- **Configurable**: Validate configuration with Zod schema validation

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
│   ├── storage/                # Storage domain
│   │   └── providers/          # Storage implementations
│   │       ├── storage.provider.ts    # Abstract storage provider
│   │       └── s3.storage.provider.ts # S3 implementation
│   ├── handler.ts              # AWS Lambda handler
│   └── index.ts                # Main application entry point
```

### Key Components

- **Backup Providers**: Abstract backup creation (MongoDB implementation)  
- **Command Providers**: Abstract command execution (Shell implementation)
- **Storage Providers**: Abstract backup storage (S3 implementation)  
- **Config Providers**: Abstract configuration retrieval (Environment implementation)  

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

| Variable               | Description                              | Required | Format          |
|------------------------|------------------------------------------|----------|-----------------|
| `MONGO_URI`            | MongoDB connection string               | Yes      | Base64 encoded  |
| `AWS_S3_BUCKET_NAME`   | S3 bucket name for storing backups      | Yes      | Base64 encoded  |
| `NODE_ENV`             | Environment ('development', 'production', 'test') | No | Plain text |

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

The project uses dependency injection with tsyringe to maintain clean separation of concerns:

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

Create a new provider that implements the BackupProvider abstract class:

```typescript
@singleton()
class PostgresBackupProvider extends BackupProvider {
  // Implement abstract methods
}

// Register in container
container.register(BackupProvider, { useClass: PostgresBackupProvider });
```

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Author

Amalu Sajeev

## Acknowledgments

- MongoDB Atlas for providing a reliable database service  
- AWS for their serverless infrastructure  
- TypeScript and Node.js communities for all the amazing tools and libraries
