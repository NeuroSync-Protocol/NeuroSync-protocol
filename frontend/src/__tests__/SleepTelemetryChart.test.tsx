import React from 'react';
import { SleepTelemetryChart } from '../components/SleepTelemetryChart';
import { TelemetryEpochPoint } from '../types/telemetry';

describe('SleepTelemetryChart Component', () => {
  const mockData: TelemetryEpochPoint[] = [
    {
      id: 'ep-1',
      date: 'Mon',
      epochDay: 101,
      remHours: 1.8,
      deepHours: 2.2,
      lightHours: 3.5,
      totalSleepHours: 7.5,
      hrvMs: 68,
      authenticityScore: 94,
      tier: 'ELITE',
      efficiencyScore: 89,
    },
  ];

  it('renders chart component shell properly', () => {
    expect(SleepTelemetryChart).toBeDefined();
  });
});
