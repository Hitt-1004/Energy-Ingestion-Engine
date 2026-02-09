import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface PerformanceMetrics {
  vehicleId: string;
  period: {
    start: string;
    end: string;
  };
  energyConsumedAc: number;
  energyDeliveredDc: number;
  efficiencyRatio: number;
  averageBatteryTemp: number;
  dataPoints: {
    vehicle: number;
    meter: number;
  };
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate 24-hour performance metrics for a vehicle
   * This query is optimized to avoid full table scans by using indexed timestamp columns
   */
  async getVehiclePerformance(vehicleId: string): Promise<PerformanceMetrics> {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Verify vehicle exists
    const vehicleExists = await this.prisma.vehicleLiveState.findUnique({
      where: { vehicleId },
    });

    if (!vehicleExists) {
      throw new NotFoundException(`Vehicle ${vehicleId} not found`);
    }

    // Query vehicle telemetry (DC delivered) - uses index on (vehicleId, timestamp)
    const vehicleData = await this.prisma.vehicleTelemetryHistory.aggregate({
      where: {
        vehicleId,
        timestamp: {
          gte: twentyFourHoursAgo,
          lte: now,
        },
      },
      _avg: {
        batteryTemp: true,
      },
      _sum: {
        kwhDeliveredDc: true,
      },
      _count: true,
    });

    // For meter correlation, we need to find the associated meter
    // In a real system, there would be a vehicle-meter mapping table
    // For this demo, we'll assume meterId matches vehicleId or follows a pattern
    const meterData = await this.prisma.meterTelemetryHistory.aggregate({
      where: {
        meterId: vehicleId, // Assuming 1:1 mapping for simplicity
        timestamp: {
          gte: twentyFourHoursAgo,
          lte: now,
        },
      },
      _sum: {
        kwhConsumedAc: true,
      },
      _count: true,
    });

    const energyDeliveredDc = vehicleData._sum.kwhDeliveredDc || 0;
    const energyConsumedAc = meterData._sum.kwhConsumedAc || 0;
    const averageBatteryTemp = vehicleData._avg.batteryTemp || 0;

    // Calculate efficiency ratio (DC delivered / AC consumed)
    const efficiencyRatio =
      energyConsumedAc > 0 ? energyDeliveredDc / energyConsumedAc : 0;

    return {
      vehicleId,
      period: {
        start: twentyFourHoursAgo.toISOString(),
        end: now.toISOString(),
      },
      energyConsumedAc,
      energyDeliveredDc,
      efficiencyRatio: Math.round(efficiencyRatio * 10000) / 100, // Convert to percentage with 2 decimals
      averageBatteryTemp: Math.round(averageBatteryTemp * 100) / 100,
      dataPoints: {
        vehicle: vehicleData._count,
        meter: meterData._count,
      },
    };
  }

  /**
   * Get current live state for a vehicle (fast lookup, no historical scan)
   */
  async getVehicleLiveState(vehicleId: string) {
    const liveState = await this.prisma.vehicleLiveState.findUnique({
      where: { vehicleId },
    });

    if (!liveState) {
      throw new NotFoundException(`Vehicle ${vehicleId} not found`);
    }

    return liveState;
  }

  /**
   * Get current live state for a meter (fast lookup, no historical scan)
   */
  async getMeterLiveState(meterId: string) {
    const liveState = await this.prisma.meterLiveState.findUnique({
      where: { meterId },
    });

    if (!liveState) {
      throw new NotFoundException(`Meter ${meterId} not found`);
    }

    return liveState;
  }
}
