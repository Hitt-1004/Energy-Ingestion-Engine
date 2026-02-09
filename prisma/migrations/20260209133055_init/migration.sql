-- CreateTable
CREATE TABLE "meter_live_state" (
    "meterId" VARCHAR(50) NOT NULL,
    "kwhConsumedAc" DOUBLE PRECISION NOT NULL,
    "voltage" DOUBLE PRECISION NOT NULL,
    "lastUpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meter_live_state_pkey" PRIMARY KEY ("meterId")
);

-- CreateTable
CREATE TABLE "vehicle_live_state" (
    "vehicleId" VARCHAR(50) NOT NULL,
    "soc" DOUBLE PRECISION NOT NULL,
    "kwhDeliveredDc" DOUBLE PRECISION NOT NULL,
    "batteryTemp" DOUBLE PRECISION NOT NULL,
    "lastUpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_live_state_pkey" PRIMARY KEY ("vehicleId")
);

-- CreateTable
CREATE TABLE "meter_telemetry_history" (
    "id" BIGSERIAL NOT NULL,
    "meterId" VARCHAR(50) NOT NULL,
    "kwhConsumedAc" DOUBLE PRECISION NOT NULL,
    "voltage" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "ingestedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meter_telemetry_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_telemetry_history" (
    "id" BIGSERIAL NOT NULL,
    "vehicleId" VARCHAR(50) NOT NULL,
    "soc" DOUBLE PRECISION NOT NULL,
    "kwhDeliveredDc" DOUBLE PRECISION NOT NULL,
    "batteryTemp" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "ingestedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_telemetry_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meter_live_state_lastUpdatedAt_idx" ON "meter_live_state"("lastUpdatedAt");

-- CreateIndex
CREATE INDEX "vehicle_live_state_lastUpdatedAt_idx" ON "vehicle_live_state"("lastUpdatedAt");

-- CreateIndex
CREATE INDEX "meter_telemetry_history_meterId_timestamp_idx" ON "meter_telemetry_history"("meterId", "timestamp");

-- CreateIndex
CREATE INDEX "meter_telemetry_history_timestamp_idx" ON "meter_telemetry_history"("timestamp");

-- CreateIndex
CREATE INDEX "vehicle_telemetry_history_vehicleId_timestamp_idx" ON "vehicle_telemetry_history"("vehicleId", "timestamp");

-- CreateIndex
CREATE INDEX "vehicle_telemetry_history_timestamp_idx" ON "vehicle_telemetry_history"("timestamp");
