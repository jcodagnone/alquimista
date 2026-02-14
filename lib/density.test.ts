import { describe, it, expect } from 'vitest';
import { 
  calculateDensity, 
  calculateWaterDensity, 
  calculateEthanolDensity,
  abvToMassFraction,
  calculateDilutionWater,
  correctHydrometerReading
} from './density';

describe('OIML R 22 Density Calculations (Wagenbreth-Blanke Model)', () => {
  
  it('should calculate pure water density correctly at 20°C', () => {
    const density = calculateWaterDensity(20);
    expect(density).toBeCloseTo(0.998201, 6);
  });

  it('should calculate pure ethanol density correctly at 20°C', () => {
    const density = calculateEthanolDensity(20);
    expect(density).toBeCloseTo(0.789239, 6);
  });

  it('should be consistent for 50% ABV at 20°C', () => {
    const density = calculateDensity(50, 20);
    // Model value (Vacuum)
    expect(density).toBeCloseTo(0.930142, 6);
  });

  it('should be consistent for 96% ABV at 20°C', () => {
    const density = calculateDensity(96, 20);
    // Model value (Vacuum)
    expect(density).toBeCloseTo(0.807419, 6);
  });

  it('should account for temperature expansion (96% ABV at 25°C)', () => {
    const d20 = calculateDensity(96, 20);
    const d25 = calculateDensity(96, 25);
    expect(d25).toBeLessThan(d20);
    expect(d25).toBeCloseTo(0.806779, 4); // Significant drop as expected
  });

  it('should calculate mass fraction p from ABV v correctly', () => {
    expect(abvToMassFraction(100)).toBe(1);
    expect(abvToMassFraction(0)).toBe(0);
    // 50% ABV -> ~42.43% mass in this vacuum-based model
    expect(abvToMassFraction(50)).toBeCloseTo(0.424258, 4);
  });

  it('should handle extreme temperatures within safe bounds', () => {
    const d20 = calculateDensity(96, 20);
    const cold = calculateDensity(96, 10);
    const hot = calculateDensity(96, 30);
    expect(cold).toBeGreaterThan(d20);
    expect(hot).toBeLessThan(d20);
  });
});

describe('Dilution and Hydrometer Correction', () => {
  it('should calculate dilution water correctly (Gravimetric)', () => {
    // 1000g of 96% ABV diluted to 40% ABV
    const result = calculateDilutionWater(1000, 96, 40);
    
    // Mass of ethanol in 1000g of 96% ABV (p ~ 0.939 in this model)
    // p1 * m1 = p2 * m2 => m2 = (m1 * p1) / p2
    expect(result.waterToAddG).toBeGreaterThan(1000); 
    expect(result.finalMassG).toBeCloseTo(result.ethanolMassG / result.targetMassFraction, 1);
  });

  it('should correct hydrometer reading for temperature', () => {
    // Reading 40% at 25°C
    const result = correctHydrometerReading(40, 25);
    
    // Higher temp means lower density, so hydrometer sinks more.
    // True ABV at 20°C should be lower than 40%.
    expect(result.trueAbv).toBeLessThan(40);
    expect(result.correction).toBeLessThan(0);
  });

  it('should return no correction at 20°C', () => {
    const result = correctHydrometerReading(50, 20);
    expect(result.trueAbv).toBeCloseTo(50, 1);
    expect(Math.abs(result.correction)).toBeLessThan(0.1);
  });
});
