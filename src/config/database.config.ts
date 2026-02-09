import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseConfig {
  constructor(private configService: ConfigService) {}

  get databaseUrl(): string {
    return this.configService.get<string>(
      'DATABASE_URL',
      'postgresql://user:password@localhost:5432/energy_db',
    );
  }

  get databaseType(): string {
    return this.configService.get<string>('DATABASE_TYPE', 'postgresql');
  }
}
