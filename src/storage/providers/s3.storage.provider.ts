import { singleton } from "tsyringe";
import { StorageProvider } from "./storage.provider";
import {S3Client, PutObjectCommand, PutObjectCommandOutput, DeleteObjectCommand, PutObjectCommandInput, DeleteObjectCommandInput, DeleteObjectCommandOutput} from '@aws-sdk/client-s3';

@singleton()
class S3StorageService extends StorageProvider {
    S3: S3Client; 
    constructor() {
        super();
        this.S3 = new S3Client({});
    }
    
    async save<TInput = PutObjectCommandInput, TResult = PutObjectCommandOutput>(data: TInput): Promise<TResult> {
        try {
            const command = new PutObjectCommand(data as PutObjectCommandInput);
            const response = await this.S3.send(command);
            return response as TResult;
        } catch (error) {
            console.error("Error saving data to S3:", error);
            throw new Error("Failed to save data to S3");
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