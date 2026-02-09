# High-Scale Energy Ingestion Engine

A high-performance NestJS backend for ingesting and analyzing telemetry data from 10,000+ Smart Meters and EV Fleets. The system handles 14.4 million records daily (10,000 devices × 60-second heartbeats × 24 hours) with optimized hot/cold storage architecture.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Getting Started](#getting-started)
- [Performance Optimizations](#performance-optimizations)
- [Testing](#testing)

## Architecture Overview

### Domain Context

The system manages two independent data streams:

1. **Smart Meter (Grid Side)**: Measures AC (Alternating Current) from the utility grid
   - Reports `kwhConsumedAc` (energy billed to fleet owner)
   - Tracks `voltage` for grid health monitoring

2. **EV & Charger (Vehicle Side)**: Tracks DC (Direct Current) delivered to battery
   - Reports `kwhDeliveredDc` (actual energy stored)
   - Monitors `soc` (State of Charge %)
   - Tracks `batteryTemp` for thermal management

**Power Loss Thesis**: AC consumed is always higher than DC delivered due to conversion losses. Efficiency below 85% indicates hardware faults or energy leakage.

### Hot/Cold Storage Strategy

The system implements a dual-persistence pattern optimized for both write-heavy ingestion and read-heavy analytics:

#### Hot Storage (Operational/Live State)
- **Purpose**: Fast access to current device status
- **Operation**: UPSERT on each telemetry heartbeat
- **Tables**: `meter_live_state`, `vehicle_live_state`
- **Use Case**: Dashboard queries for "current SoC" or "last known voltage"
- **Performance**: O(1) lookup by primary key, no full table scans

#### Cold Storage (Historical/Audit Trail)
- **Purpose**: Long-term analytics and compliance
- **Operation**: INSERT-only (append-only log)
- **Tables**: `meter_telemetry_history`, `vehicle_telemetry_history`
- **Use Case**: Time-series analytics, efficiency reports, audit trails
- **Performance**: Indexed by `(deviceId, timestamp)` for range queries

### Data Flow

```
Telemetry Heartbeat (60s intervals)
         ↓
  NestJS Ingestion API
    (Validation Layer)
         ↓
   Prisma Transaction
    /            \
   /              \
INSERT            UPSERT
(Cold)            (Hot)
  ↓                ↓
History Table    Live State Table
```

## Key Features

1. **Polymorphic Ingestion**: Handles distinct meter and vehicle telemetry schemas with type-safe validation
2. **Transactional Consistency**: Atomic writes to both hot and cold storage
3. **Batch Processing**: Efficient bulk ingestion endpoints for high-throughput scenarios
4. **Optimized Analytics**: Indexed queries avoid full table scans even with billions of rows
5. **Real-time Efficiency Monitoring**: Calculates AC/DC conversion efficiency for fault detection

## Technology Stack

- **Framework**: NestJS 11.0 (TypeScript)
- **Database**: PostgreSQL 15
- **ORM**: Prisma 5.22
- **Validation**: class-validator, class-transformer
- **Containerization**: Docker Compose

## Database Schema

### Hot Storage Tables

```sql
-- Fast current-state lookup (UPSERT pattern)
CREATE TABLE meter_live_state (
  meter_id VARCHAR(50) PRIMARY KEY,
  kwh_consumed_ac DOUBLE PRECISION,
  voltage DOUBLE PRECISION,
  last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vehicle_live_state (
  vehicle_id VARCHAR(50) PRIMARY KEY,
  soc DOUBLE PRECISION,
  kwh_delivered_dc DOUBLE PRECISION,
  battery_temp DOUBLE PRECISION,
  last_updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Cold Storage Tables

```sql
-- Append-only historical data (INSERT pattern)
CREATE TABLE meter_telemetry_history (
  id BIGSERIAL PRIMARY KEY,
  meter_id VARCHAR(50),
  kwh_consumed_ac DOUBLE PRECISION,
  voltage DOUBLE PRECISION,
  timestamp TIMESTAMPTZ,
  ingested_at TIMESTAMPTZ DEFAULT NOW()
);

-- Composite index for efficient time-range queries
CREATE INDEX idx_meter_history ON meter_telemetry_history(meter_id, timestamp);
CREATE INDEX idx_meter_timestamp ON meter_telemetry_history(timestamp);

CREATE TABLE vehicle_telemetry_history (
  id BIGSERIAL PRIMARY KEY,
  vehicle_id VARCHAR(50),
  soc DOUBLE PRECISION,
  kwh_delivered_dc DOUBLE PRECISION,
  battery_temp DOUBLE PRECISION,
  timestamp TIMESTAMPTZ,
  ingested_at TIMESTAMPTZ DEFAULT NOW()
);

-- Composite index for efficient time-range queries
CREATE INDEX idx_vehicle_history ON vehicle_telemetry_history(vehicle_id, timestamp);
CREATE INDEX idx_vehicle_timestamp ON vehicle_telemetry_history(timestamp);
```

## API Endpoints

### Ingestion Endpoints

#### Single Device Ingestion

```bash
# Meter telemetry
POST /v1/ingest/meter
Content-Type: application/json
{
  "meterId": "METER001",
  "kwhConsumedAc": 25.5,
  "voltage": 230.0,
  "timestamp": "2025-02-09T13:30:00Z"
}

# Vehicle telemetry
POST /v1/ingest/vehicle
Content-Type: application/json
{
  "vehicleId": "VEH001",
  "soc": 85.0,
  "kwhDeliveredDc": 21.5,
  "batteryTemp": 32.0,
  "timestamp": "2025-02-09T13:30:00Z"
}
```

#### Batch Ingestion

```bash
# Batch meter ingestion
POST /v1/ingest/meter/batch
Content-Type: application/json
[
  {
    "meterId": "METER001",
    "kwhConsumedAc": 25.5,
    "voltage": 230.0,
    "timestamp": "2025-02-09T13:30:00Z"
  },
  {
    "meterId": "METER002",
    "kwhConsumedAc": 30.0,
    "voltage": 232.0,
    "timestamp": "2025-02-09T13:30:00Z"
  }
]

# Batch vehicle ingestion
POST /v1/ingest/vehicle/batch
```

### Analytics Endpoints

#### Performance Analysis (24-hour)

```bash
GET /v1/analytics/performance/:vehicleId

Response:
{
  "vehicleId": "VEH001",
  "period": {
    "start": "2025-02-08T13:30:00Z",
    "end": "2025-02-09T13:30:00Z"
  },
  "energyConsumedAc": 25.5,      # Total AC from grid
  "energyDeliveredDc": 21.5,      # Total DC to battery
  "efficiencyRatio": 84.31,       # DC/AC percentage
  "averageBatteryTemp": 32.0,
  "dataPoints": {
    "vehicle": 1440,               # 60-second intervals over 24h
    "meter": 1440
  }
}
```

#### Live State Queries

```bash
# Current vehicle status (fast O(1) lookup)
GET /v1/analytics/vehicle/:vehicleId/live

Response:
{
  "vehicleId": "VEH001",
  "soc": 85.0,
  "kwhDeliveredDc": 21.5,
  "batteryTemp": 32.0,
  "lastUpdatedAt": "2025-02-09T13:30:00Z"
}

# Current meter status
GET /v1/analytics/meter/:meterId/live
```

## Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- npm or yarn

### Environment Variables

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
cp .env.example .env
```

**Required environment variables:**

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - | `postgresql://postgres:postgres@localhost:5433/energy?schema=public` |
| `PORT` | Application port | `3000` | `3000` |
| `POSTGRES_DB` | Database name (docker-compose) | `energy` | `energy` |
| `POSTGRES_USER` | Database user (docker-compose) | `postgres` | `postgres` |
| `POSTGRES_PASSWORD` | Database password (docker-compose) | `postgres` | `postgres` |

**Note:**
- For **local development** (connecting to dockerized DB from host), use `localhost:5433` in `DATABASE_URL`
- For **Docker deployment** (API container connecting to DB container), use `postgres:5432` in `DATABASE_URL` (handled automatically in docker-compose.yml)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start PostgreSQL database
docker-compose up -d postgres

# Run Prisma migrations
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate
```

### Development

```bash
# Start in watch mode
npm run start:dev

# Build for production
npm run build

# Start production server
npm run start:prod
```

### Docker Deployment

```bash
# Start entire stack (API + PostgreSQL)
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

The API will be available at `http://localhost:3000`

## Performance Optimizations

### 1. Dual Storage Architecture
- **Hot storage** provides O(1) lookups for dashboard queries
- **Cold storage** uses composite indexes `(deviceId, timestamp)` for efficient range scans

### 2. Query Optimization
```typescript
// Analytics query uses indexed columns to avoid full table scan
const vehicleData = await prisma.vehicleTelemetryHistory.aggregate({
  where: {
    vehicleId,                    // Uses index
    timestamp: {                  // Uses index
      gte: twentyFourHoursAgo,
      lte: now,
    },
  },
  _avg: { batteryTemp: true },
  _sum: { kwhDeliveredDc: true },
});
```

### 3. Transactional Writes
```typescript
await prisma.$transaction([
  prisma.meterTelemetryHistory.create(...),  // Cold
  prisma.meterLiveState.upsert(...),         // Hot
]);
```

### 4. Batch Processing
Batch endpoints use `Promise.allSettled()` for parallel processing with graceful error handling.

### Scale Considerations

With 10,000 devices at 60-second intervals:
- **Daily ingestion**: 14.4M records (10k × 1,440 readings/day)
- **Annual growth**: 5.26B records/year
- **Hot storage**: ~10k rows (one per device) - constant size
- **Cold storage**: Linear growth, partitionable by timestamp for archival

**Recommended scaling strategies:**
1. Implement table partitioning by month for history tables
2. Archive old data to cold object storage (S3/GCS)
3. Use connection pooling (PgBouncer) for high concurrency
4. Consider TimescaleDB for time-series optimizations

## Testing

### Manual API Testing

```bash
# Test meter ingestion
curl -X POST http://localhost:3000/v1/ingest/meter \
  -H "Content-Type: application/json" \
  -d '{"meterId": "METER001", "kwhConsumedAc": 25.5, "voltage": 230.0, "timestamp": "2025-02-09T13:30:00Z"}'

# Test analytics
curl http://localhost:3000/v1/analytics/performance/METER001 | jq
```

### Unit Tests

```bash
npm run test
```

### End-to-End Tests

```bash
npm run test:e2e
```

## Project Structure

```
src/
├── analytics/           # Performance analytics module
│   ├── analytics.controller.ts
│   ├── analytics.service.ts
│   └── analytics.module.ts
├── ingest/             # Telemetry ingestion module
│   ├── dto/
│   │   ├── meter.dto.ts
│   │   └── vehicle.dto.ts
│   ├── ingest.controller.ts
│   ├── ingest.service.ts
│   └── ingest.module.ts
├── database/           # Prisma integration
│   ├── prisma.service.ts
│   └── database.module.ts
├── app.module.ts
└── main.ts

prisma/
├── schema.prisma       # Database schema with hot/cold separation
└── migrations/         # Migration history

# Configuration files
├── .env                # Environment variables (not in git)
├── .env.example        # Template for environment variables
├── .dockerignore       # Docker build exclusions
├── Dockerfile          # Multi-stage build configuration
├── docker-compose.yml  # Service orchestration
└── README.md           # This file
```

## Docker Configuration

### Dockerfile

The Dockerfile uses a single-stage Node.js Alpine image:

1. **Dependencies Installation**: Copies `package.json` and Prisma schema first for layer caching
2. **Prisma Generation**: Generates Prisma Client before build
3. **Application Build**: Compiles TypeScript to JavaScript
4. **Runtime**: Runs migrations on startup, then starts the production server

### docker-compose.yml

Defines two services:

- **postgres**: PostgreSQL 15 Alpine with health checks, persistent volume, and exposed port 5433 (mapped from internal 5432)
- **api**: NestJS application with automatic migration deployment and restart policy

Environment variables in `docker-compose.yml`:
- API service uses internal network name `postgres:5432`
- Postgres credentials are injected via environment variables

### .dockerignore

Excludes development files, logs, and `node_modules` to reduce build context size and improve build speed.

## License

This project is licensed under the MIT License.
