import { Global, Module } from '@nestjs/common';
import { STORAGE_SERVICE } from './storage.service';
import { MinioStorageService } from './minio-storage.service';

@Global()
@Module({
  providers: [
    MinioStorageService,
    { provide: STORAGE_SERVICE, useExisting: MinioStorageService },
  ],
  exports: [STORAGE_SERVICE, MinioStorageService],
})
export class StorageModule {}
