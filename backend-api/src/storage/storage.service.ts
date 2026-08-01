import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { randomUUID } from 'crypto';

/**
 * Thin wrapper around the S3 API (minio SDK, S3-compatible).
 * Works unmodified against local MinIO or a managed S3 provider
 * (e.g. Cloudflare R2) by only changing env vars — no code changes.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: Client;
  private bucket: string;
  private publicUrl: string;

  constructor(private config: ConfigService) {
    const endpoint = this.config.get<string>('S3_ENDPOINT') ?? 'localhost';
    const useSSL = (this.config.get<string>('S3_USE_SSL') ?? 'false') === 'true';
    const port = this.config.get<string>('S3_PORT');

    this.client = new Client({
      endPoint: endpoint.replace(/^https?:\/\//, '').split(':')[0],
      port: port ? parseInt(port, 10) : undefined,
      useSSL,
      accessKey: this.config.get<string>('S3_KEY') ?? '',
      secretKey: this.config.get<string>('S3_SECRET') ?? '',
      region: this.config.get<string>('S3_REGION') ?? 'us-east-1',
    });

    this.bucket = this.config.get<string>('S3_BUCKET') ?? 'signage-media';
    this.publicUrl = this.config.get<string>('S3_PUBLIC_URL') ?? '';
  }

  async onModuleInit() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(`Created bucket ${this.bucket}`);
      }
    } catch (err) {
      this.logger.warn(`Could not verify/create bucket on startup: ${(err as Error).message}`);
    }
  }

  async upload(buffer: Buffer, originalName: string, mimeType: string) {
    const ext = originalName.includes('.') ? originalName.split('.').pop() : '';
    const objectKey = `${randomUUID()}${ext ? `.${ext}` : ''}`;

    await this.client.putObject(this.bucket, objectKey, buffer, buffer.length, {
      'Content-Type': mimeType,
    });

    return {
      bucket: this.bucket,
      objectKey,
      url: this.getPublicUrl(objectKey),
    };
  }

  getPublicUrl(objectKey: string) {
    if (this.publicUrl) {
      return `${this.publicUrl.replace(/\/$/, '')}/${this.bucket}/${objectKey}`;
    }
    return `/media/${objectKey}`;
  }

  async remove(objectKey: string) {
    await this.client.removeObject(this.bucket, objectKey);
  }

  async presignedGetUrl(objectKey: string, expirySeconds = 3600) {
    return this.client.presignedGetObject(this.bucket, objectKey, expirySeconds);
  }
}
