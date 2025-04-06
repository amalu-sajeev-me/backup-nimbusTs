import { singleton, inject } from "tsyringe";
import { StorageProvider } from "./storage.provider";
import { S3Client, PutObjectCommand, PutObjectCommandOutput, DeleteObjectCommand, PutObjectCommandInput, DeleteObjectCommandInput, DeleteObjectCommandOutput } from '@aws-sdk/client-s3';
import { ConfigService } from "../../config/config.service";
import { configSchema } from "../../config/config.schema";
import { z } from "zod";
import { StorageError } from "../../error";

@singleton()
class S3StorageService extends StorageProvider {
    private readonly S3: S3Client; 
    
    constructor(@inject(ConfigService) private readonly configService: ConfigService<z.infer<typeof configSchema>>) {
        super();
        // Explicitly configure region - use environment AWS_REGION if available or default to us-east-1
        const region = process.env.AWS_REGION ?? 'us-east-1';
        console.log(`Initializing S3 client with region: ${region}`);
        
        this.S3 = new S3Client({
            region,
            // Make SDK return detailed errors
            retryMode: 'standard', // Enable automatic retries
            maxAttempts: 3 // Retry up to 3 times
        });
    }
    
    // Update the save method with proper error handling:
    async save<TInput = PutObjectCommandInput, TResult = PutObjectCommandOutput>(data: TInput): Promise<TResult> {
        try {
            console.log(`Uploading to S3 bucket: ${(data as PutObjectCommandInput).Bucket}, key: ${(data as PutObjectCommandInput).Key}`);
            const command = new PutObjectCommand(data as PutObjectCommandInput);
            const response = await this.S3.send(command);
            console.log(`S3 upload successful: ${JSON.stringify(response)}`);
            return response as TResult;
        } catch (error) {
            console.error("Error saving data to S3:", error);
            // Add more detailed error logging
            if (error instanceof Error) {
                console.error(`Error name: ${error.name}, message: ${error.message}, stack: ${error.stack}`);
            }
            throw new StorageError(`Failed to save data to S3: ${error instanceof Error ? error.message : String(error)}`, {
                details: {
                    bucket: (data as PutObjectCommandInput).Bucket,
                    key: (data as PutObjectCommandInput).Key
                },
                cause: error
            });
        }
    }
    
    async delete<TInput = DeleteObjectCommandInput, TResult = DeleteObjectCommandOutput>(options: TInput): Promise<TResult> {
        try {
            const command = new DeleteObjectCommand(options as DeleteObjectCommandInput);
            const result = await this.S3.send(command);
            return result as TResult;
        } catch (error) {
            console.error("Error deleting data from S3:", error);
            throw new Error("Failed to delete data from S3");
            
        }
    }
}

export { S3StorageService };