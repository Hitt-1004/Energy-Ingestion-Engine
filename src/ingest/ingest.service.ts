import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MeterTelemetryDto } from './dto/meter.dto';
import { VehicleTelemetryDto } from './dto/vehicle.dto';

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ingests meter telemetry data using dual persistence:
   * 1. INSERT into historical table (audit trail)
   * 2. UPSERT into live state table (fast current status)
   */
  async ingestMeterData(data: MeterTelemetryDto) {
    const timestamp = new Date(data.timestamp);

    try {
      await this.prisma.$transaction([
        // COLD STORAGE: Append-only historical record
        this.prisma.meterTelemetryHistory.create({
          data: {
            meterId: data.meterId,
            kwhConsumedAc: data.kwhConsumedAc,
            voltage: data.voltage,
            timestamp,
          },
        }),
        // HOT STORAGE: Upsert for latest state
        this.prisma.meterLiveState.upsert({
          where: { meterId: data.meterId },
          update: {
            kwhConsumedAc: data.kwhConsumedAc,
            voltage: data.voltage,
            lastUpdatedAt: timestamp,
          },
          create: {
            meterId: data.meterId,
            kwhConsumedAc: data.kwhConsumedAc,
            voltage: data.voltage,
            lastUpdatedAt: timestamp,
          },
        }),
      ]);

      this.logger.log(`Meter ${data.meterId} telemetry ingested successfully`);
      return { success: true, meterId: data.meterId };
    } catch (error) {
      this.logger.error(`Failed to ingest meter telemetry: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ingests vehicle telemetry data using dual persistence:
   * 1. INSERT into historical table (audit trail)
   * 2. UPSERT into live state table (fast current status)
   */
  async ingestVehicleData(data: VehicleTelemetryDto) {
    const timestamp = new Date(data.timestamp);

    try {
      await this.prisma.$transaction([
        // COLD STORAGE: Append-only historical record
        this.prisma.vehicleTelemetryHistory.create({
          data: {
            vehicleId: data.vehicleId,
            soc: data.soc,
            kwhDeliveredDc: data.kwhDeliveredDc,
            batteryTemp: data.batteryTemp,
            timestamp,
          },
        }),
        // HOT STORAGE: Upsert for latest state
        this.prisma.vehicleLiveState.upsert({
          where: { vehicleId: data.vehicleId },
          update: {
            soc: data.soc,
            kwhDeliveredDc: data.kwhDeliveredDc,
            batteryTemp: data.batteryTemp,
            lastUpdatedAt: timestamp,
          },
          create: {
            vehicleId: data.vehicleId,
            soc: data.soc,
            kwhDeliveredDc: data.kwhDeliveredDc,
            batteryTemp: data.batteryTemp,
            lastUpdatedAt: timestamp,
          },
        }),
      ]);

      this.logger.log(
        `Vehicle ${data.vehicleId} telemetry ingested successfully`,
      );
      return { success: true, vehicleId: data.vehicleId };
    } catch (error) {
      this.logger.error(`Failed to ingest vehicle telemetry: ${error.message}`);
      throw error;
    }
  }

  /**
   * Batch ingestion for multiple meter readings
   */
  async ingestMeterBatch(data: MeterTelemetryDto[]) {
    const results = await Promise.allSettled(
      data.map((item) => this.ingestMeterData(item)),
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return {
      total: data.length,
      successful,
      failed,
    };
  }

  /**
   * Batch ingestion for multiple vehicle readings
   */
  async ingestVehicleBatch(data: VehicleTelemetryDto[]) {
    const results = await Promise.allSettled(
      data.map((item) => this.ingestVehicleData(item)),
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return {
      total: data.length,
      successful,
      failed,
    };
  }
}
