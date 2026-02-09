import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { IngestService } from './ingest.service';
import { MeterTelemetryDto } from './dto/meter.dto';
import { VehicleTelemetryDto } from './dto/vehicle.dto';

@Controller('v1/ingest')
export class IngestController {
  constructor(private readonly ingestService: IngestService) {}

  @Post('meter')
  @HttpCode(HttpStatus.CREATED)
  async ingestMeter(@Body() data: MeterTelemetryDto) {
    return this.ingestService.ingestMeterData(data);
  }

  @Post('vehicle')
  @HttpCode(HttpStatus.CREATED)
  async ingestVehicle(@Body() data: VehicleTelemetryDto) {
    return this.ingestService.ingestVehicleData(data);
  }

  @Post('meter/batch')
  @HttpCode(HttpStatus.CREATED)
  async ingestMeterBatch(@Body() data: MeterTelemetryDto[]) {
    return this.ingestService.ingestMeterBatch(data);
  }

  @Post('vehicle/batch')
  @HttpCode(HttpStatus.CREATED)
  async ingestVehicleBatch(@Body() data: VehicleTelemetryDto[]) {
    return this.ingestService.ingestVehicleBatch(data);
  }
}
