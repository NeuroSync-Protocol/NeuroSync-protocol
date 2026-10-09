import { getAuthenticityTier } from '../components/AuthenticityScoreBadge';

describe('Streak & Multiplier Calculations', () => {
  it('assigns ELITE tier for score >= 90', () => {
    const tierResult = getAuthenticityTier(95);
    expect(tierResult.tier).toBe('ELITE');
  });

  it('assigns VERIFIED tier for score between 75 and 89', () => {
    const tierResult = getAuthenticityTier(82);
    expect(tierResult.tier).toBe('VERIFIED');
  });

  it('assigns SUSPICIOUS tier for score between 50 and 74', () => {
    const tierResult = getAuthenticityTier(60);
    expect(tierResult.tier).toBe('SUSPICIOUS');
  });

  it('assigns REJECTED tier for score below 50', () => {
    const tierResult = getAuthenticityTier(35);
    expect(tierResult.tier).toBe('REJECTED');
  });
});
