export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');

export interface StorageService {
  ensureBucket(): Promise<void>;
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  getObjectUrl(key: string, expirySeconds?: number): Promise<string>;
  getUploadUrl(key: string, expirySeconds?: number): Promise<string>;
}
