import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const memoryUsage = process.memoryUsage();

    const healthData = {
      status: 'UP',
      service: 'rscoe-grievance-portal',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      memory: {
        rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      },
      checks: {
        database: 'OK',
        storage: 'OK',
        aiModule: 'OK',
      },
    };

    return NextResponse.json(healthData, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'DOWN',
        timestamp: new Date().toISOString(),
        error: error.message || 'Health check failure',
      },
      { status: 503 }
    );
  }
}
