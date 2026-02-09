import { IsString, IsNumber, IsDateString, Min } from 'class-validator';

export class MeterTelemetryDto {
  @IsString()
  meterId: string;

  @IsNumber()
  @Min(0)
  kwhConsumedAc: number;

  @IsNumber()
  @Min(0)
  voltage: number;

  @IsDateString()
  timestamp: string;
}
