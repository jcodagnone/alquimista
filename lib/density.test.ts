import { describe, it, expect } from 'vitest';
import { 
  calculateDensity, 
  calculateEthanolDensity,
  abvToMassFraction,
  calculateDilutionWater,
  calculateTargetVolumeDilution,
  correctHydrometerReading,
  calculateVolumeFromMass
} from './density';

describe('OIML R 22 Density Calculations (Wagenbreth-Blanke Model)', () => {
  
  it('should calculate pure water density correctly at 20°C', () => {
    const { density } = calculateDensity(0, 20);
    expect(density).toBeCloseTo(0.998201, 6);
  });

  it('should calculate pure ethanol density correctly at 20°C', () => {
    const density = calculateEthanolDensity(20);
    expect(density).toBeCloseTo(0.789239, 6);
  });

  it('should be consistent for 50% ABV at 20°C', () => {
    const { density } = calculateDensity(50, 20);
    // Model value (Vacuum)
    expect(density).toBeCloseTo(0.930142, 6);
  });

  it('should be consistent for 96% ABV at 20°C', () => {
    const { density } = calculateDensity(96, 20);
    // Model value (Vacuum)
    expect(density).toBeCloseTo(0.807419, 6);
  });

  it('should account for temperature expansion (96% ABV at 25°C)', () => {
    const { density: d20 } = calculateDensity(96, 20);
    const { density: d25 } = calculateDensity(96, 25);
    expect(d25).toBeLessThan(d20);
    expect(d25).toBeCloseTo(0.802978, 4); // Significant drop as expected
  });

  it('should calculate mass fraction p from ABV v correctly', () => {
    expect(abvToMassFraction(100)).toBe(1);
    expect(abvToMassFraction(0)).toBe(0);
    // 50% ABV -> ~42.43% mass in this vacuum-based model
    expect(abvToMassFraction(50)).toBeCloseTo(0.424258, 4);
  });

  it('should handle extreme temperatures within safe bounds', () => {
    const { density: d20 } = calculateDensity(96, 20);
    const { density: cold } = calculateDensity(96, 10);
    const { density: hot } = calculateDensity(96, 30);
    expect(cold).toBeGreaterThan(d20);
    expect(hot).toBeLessThan(d20);
  });

  it('should calculate contraction factor > 1 for 50% ABV', () => {
    const { contractionFactor } = calculateDensity(50, 20);
    // Contraction is max around 50%, should be > 1
    expect(contractionFactor).toBeGreaterThan(1);
    expect(contractionFactor).toBeLessThan(1.05);
  });
});

describe('Dilution and Hydrometer Correction', () => {
  it('should calculate dilution water correctly (Gravimetric)', () => {
    // 1000g of 96% ABV diluted to 40% ABV
    // Reference (OIML R 22): p(96) = 0.9384, p(40) = 0.3330
    // m2 = 1000 * 0.9384 / 0.3330 = 2818.0g
    // water = 1818.0g
    const result = calculateDilutionWater(1000, 96, 40);
    expect(result.waterToAddG).toBeCloseTo(1818.0, 1);
    expect(result.finalMassG).toBeCloseTo(2818.0, 1);
  });

  it('should correct hydrometer reading for temperature (OIML R 22 Table 5 equivalents)', () => {
    // Reading 40% at 25°C. 
    // Higher temp -> liquid less dense -> hydrometer sinks more.
    // True ABV at 20°C should be lower (~38.3%)
    const result25 = correctHydrometerReading(40, 25);
    expect(result25.trueAbv).toBeCloseTo(38.3, 1);
    expect(result25.correction).toBeCloseTo(-1.7, 1);

    // Reading 40% at 15°C.
    // Lower temp -> liquid denser -> hydrometer floats more.
    // True ABV at 20°C should be higher (~41.5%)
    const result15 = correctHydrometerReading(40, 15);
    expect(result15.trueAbv).toBeCloseTo(41.5, 1);
    expect(result15.correction).toBeCloseTo(1.5, 1);
  });

  it('should return no correction at 20°C', () => {
    const result = correctHydrometerReading(50, 20);
    expect(result.trueAbv).toBeCloseTo(50, 1);
    expect(Math.abs(result.correction)).toBeLessThan(0.1);
  });

  it('should calculate target volume dilution correctly', () => {
    // Target 1000 mL of 60% ABV at 20°C from 96% Source
    // This is the user's specific request.
    const { 
      sourceMassG, 
      waterToAddG, 
      finalMassG, 
      ethanolMassG 
    } = calculateTargetVolumeDilution(1000, 60, 96, 20);

    // 1. Calculate Target Density & Mass
    // rho(60, 20) ~ 0.909 g/mL
    // Mass Target = 1000 * 0.909 = 909g
    expect(finalMassG).toBeCloseTo(909, 0);

    // 2. Calculate Ethanol Mass
    // p(60) ~ 0.52
    // Mass Ethanol = 909 * 0.52 ~ 472g
    expect(ethanolMassG).toBeGreaterThan(470);
    expect(ethanolMassG).toBeLessThan(480);

    // 3. Calculate Source Mass
    // p(96) ~ 0.938
    // Mass Source = 473.6 / 0.9385 ~ 504.6g
    expect(sourceMassG).toBeCloseTo(504.6, 1);

    // 4. Calculate Water Mass
    // Water = 909.1 - 504.6 = 404.5g
    expect(waterToAddG).toBeCloseTo(404.5, 1);
  });
});

describe('Module Specific Calculations', () => {
  it('should calculate "Pesaje de Alcohol Puro" (Target Volume -> Mass)', () => {
    // Target 1000ml of 96% ABV at 20°C
    // rho(96, 20) = 0.807419
    // mass = 1000 * 0.807419 = 807.42g
    const { density } = calculateDensity(96, 20);
    const mass = 1000 * density;
    expect(mass).toBeCloseTo(807.42, 2);
  });

  it('should calculate "Volumen por Peso" (Mass -> Volume)', () => {
    // 1000g of 40% ABV at 20°C
    // rho(40, 20) = 0.94805
    // volume = 1000 / 0.94805 = 1054.80ml
    const result = calculateVolumeFromMass(1000, 40, 20);
    expect(result.volumeMl).toBeCloseTo(1054.80, 2);
    expect(result.density).toBeCloseTo(0.94805, 5);
  });
});
