import { Controller, Get, Param } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('v1/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('performance/:vehicleId')
  async getPerformance(@Param('vehicleId') vehicleId: string) {
    return this.analyticsService.getVehiclePerformance(vehicleId);
  }

  @Get('vehicle/:vehicleId/live')
  async getVehicleLiveState(@Param('vehicleId') vehicleId: string) {
    return this.analyticsService.getVehicleLiveState(vehicleId);
  }

  @Get('meter/:meterId/live')
  async getMeterLiveState(@Param('meterId') meterId: string) {
    return this.analyticsService.getMeterLiveState(meterId);
  }
}
