/**
 * OIML R 22 Density Calculations for Ethanol-Water Mixtures
 * Based on International Alcoholometric Tables
 */

// Constants for pure substance densities at 20°C
const RHO_ETHANOL_20 = 0.78924
const RHO_WATER_20 = 0.9982

/**
 * Calculates the density of pure water at a given temperature
 * Using Tanaka equation (simplified)
 * @param tempC - Temperature in Celsius
 * @returns Density in g/mL
 */
export function calculateWaterDensity(tempC: number): number {
  const density =
    (0.999965 +
      3.974e-4 * tempC -
      5.424e-6 * Math.pow(tempC, 2) +
      3.308e-8 * Math.pow(tempC, 3)) /
    (1 + 1.688e-2 * tempC)
  return density
}

/**
 * Calculates the density of pure ethanol at a given temperature
 * @param tempC - Temperature in Celsius
 * @returns Density in g/mL
 */
export function calculateEthanolDensity(tempC: number): number {
  return 0.792344 - 0.000725 * tempC - 0.000002 * Math.pow(tempC, 2)
}

/**
 * Converts ABV (Volume Fraction) to Mass Fraction
 * @param abv - Alcohol by Volume (0-100)
 * @returns Mass fraction (0-1)
 */
export function abvToMassFraction(abv: number): number {
  const volFrac = abv / 100
  const massFrac =
    (volFrac * RHO_ETHANOL_20) /
    (volFrac * RHO_ETHANOL_20 + (1 - volFrac) * RHO_WATER_20)
  return massFrac
}

/**
 * Converts Mass Fraction to ABV (Volume Fraction)
 * @param massFrac - Mass fraction (0-1)
 * @returns ABV (0-100)
 */
export function massFractionToAbv(massFrac: number): number {
  // Inverse of abvToMassFraction
  // massFrac = (V * rho_eth) / (V * rho_eth + (1-V) * rho_water)
  // Solving for V:
  const numerator = massFrac * RHO_WATER_20
  const denominator =
    RHO_ETHANOL_20 - massFrac * RHO_ETHANOL_20 + massFrac * RHO_WATER_20
  const volFrac = numerator / denominator
  return volFrac * 100
}

/**
 * Calculates the density of an ethanol-water mixture
 * Based on OIML R 22 approximation algorithms
 * @param abv - Alcohol by Volume at 20°C (0-100)
 * @param tempC - Temperature in Celsius
 * @returns Density in g/mL
 */
export function calculateDensity(abv: number, tempC: number): number {
  const densityWater = calculateWaterDensity(tempC)

  // If ABV is 0, return water density
  if (abv <= 0) return densityWater

  const densityEthanol = calculateEthanolDensity(tempC)

  // If ABV is 100, return ethanol density
  if (abv >= 100) return densityEthanol

  // Convert Volume Fraction (ABV) to Mass Fraction
  const massFrac = abvToMassFraction(abv)

  // Apply the OIML Density Formula with contraction factor
  // The contraction factor accounts for non-ideal mixing
  const contractionPenalty =
    massFrac * (1 - massFrac) * (0.0025 + (0.0005 * Math.abs(20 - tempC)) / 10)

  const mixtureDensity =
    densityWater -
    massFrac * (densityWater - densityEthanol) -
    contractionPenalty

  return parseFloat(mixtureDensity.toFixed(4))
}

/**
 * Calculates volume from mass using density
 * @param massG - Mass in grams
 * @param abv - Alcohol by Volume (0-100)
 * @param tempC - Temperature in Celsius
 * @returns Volume in mL
 */
export function calculateVolumeFromMass(
  massG: number,
  abv: number,
  tempC: number
): { volumeMl: number; density: number } {
  const density = calculateDensity(abv, tempC)
  const volumeMl = massG / density
  return {
    volumeMl: parseFloat(volumeMl.toFixed(2)),
    density,
  }
}

/**
 * Calculates the mass of pure ethanol in a solution
 * @param volumeMl - Volume in mL
 * @param abv - Alcohol by Volume (0-100)
 * @param tempC - Temperature in Celsius
 * @returns Mass of ethanol in grams
 */
export function calculateEthanolMass(
  volumeMl: number,
  abv: number,
  tempC: number
): number {
  const density = calculateDensity(abv, tempC)
  const totalMass = volumeMl * density
  const massFrac = abvToMassFraction(abv)
  return parseFloat((totalMass * massFrac).toFixed(2))
}

/**
 * Calculates the water needed to dilute a spirit to a target ABV (Gravimetric)
 * @param sourceMassG - Mass of source spirit in grams
 * @param sourceAbv - Source ABV (0-100)
 * @param targetAbv - Target ABV (0-100)
 * @param tempC - Temperature in Celsius
 * @returns Water to add in grams and calculation details
 */
export function calculateDilutionWater(
  sourceMassG: number,
  sourceAbv: number,
  targetAbv: number
): {
  waterToAddG: number
  finalMassG: number
  ethanolMassG: number
  sourceMassFraction: number
  targetMassFraction: number
} {
  // Calculate mass fraction of ethanol in source
  const sourceMassFraction = abvToMassFraction(sourceAbv)

  // Calculate mass of pure ethanol
  const ethanolMassG = sourceMassG * sourceMassFraction

  // Calculate target mass fraction
  const targetMassFraction = abvToMassFraction(targetAbv)

  // Calculate total mass needed for target concentration
  // ethanolMass = totalMass * targetMassFraction
  // totalMass = ethanolMass / targetMassFraction
  const finalMassG = ethanolMassG / targetMassFraction

  // Water to add
  const waterToAddG = finalMassG - sourceMassG

  return {
    waterToAddG: parseFloat(waterToAddG.toFixed(1)),
    finalMassG: parseFloat(finalMassG.toFixed(1)),
    ethanolMassG: parseFloat(ethanolMassG.toFixed(2)),
    sourceMassFraction: parseFloat(sourceMassFraction.toFixed(4)),
    targetMassFraction: parseFloat(targetMassFraction.toFixed(4)),
  }
}

/**
 * Temperature correction table for hydrometer readings
 * Based on standard alcoholometer correction tables (like copper-alembic.com)
 * Returns the correction value to ADD to the hydrometer reading
 *
 * The table uses ABV ranges and temperature to determine correction:
 * - At 20°C: no correction needed (hydrometers are calibrated at 20°C)
 * - Below 20°C: liquid is denser, hydrometer reads LOW, add positive correction
 * - Above 20°C: liquid is less dense, hydrometer reads HIGH, add negative correction
 */

// ABV ranges for correction table [min, max]
const ABV_RANGES: [number, number, string][] = [
  [0, 10, '0-10'],
  [10.1, 20, '10-20'],
  [20.1, 30, '20-30'],
  [30.1, 40, '30-40'],
  [40.1, 50, '40-50'],
  [50.1, 60, '50-60'],
  [60.1, 70, '60-70'],
  [70.1, 80, '70-80'],
  [80.1, 90, '80-90'],
  [90.1, 100, '90-100'],
]

// Correction values by temperature and ABV range
// Format: temp -> [correction for each ABV range from 0-10 to 90-100]
const CORRECTION_TABLE: Record<number, number[]> = {
  10: [0.6, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4],
  11: [0.5, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.0, 1.1, 1.2],
  12: [0.5, 0.5, 0.5, 0.6, 0.7, 0.8, 0.8, 0.9, 1.0, 1.1],
  13: [0.4, 0.4, 0.5, 0.5, 0.6, 0.7, 0.7, 0.8, 0.9, 0.9],
  14: [0.3, 0.4, 0.4, 0.5, 0.5, 0.6, 0.6, 0.7, 0.7, 0.8],
  15: [0.3, 0.3, 0.3, 0.4, 0.4, 0.5, 0.5, 0.6, 0.6, 0.7],
  16: [0.2, 0.2, 0.3, 0.3, 0.4, 0.4, 0.4, 0.5, 0.5, 0.5],
  17: [0.2, 0.2, 0.2, 0.2, 0.3, 0.3, 0.3, 0.3, 0.4, 0.4],
  18: [0.1, 0.1, 0.1, 0.2, 0.2, 0.2, 0.2, 0.2, 0.3, 0.3],
  19: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
  20: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  21: [-0.1, -0.1, -0.1, -0.1, -0.1, -0.1, -0.1, -0.1, -0.2, -0.2],
  22: [-0.2, -0.2, -0.2, -0.2, -0.2, -0.2, -0.3, -0.3, -0.3, -0.3],
  23: [-0.2, -0.2, -0.3, -0.3, -0.3, -0.4, -0.4, -0.4, -0.5, -0.5],
  24: [-0.3, -0.3, -0.3, -0.4, -0.4, -0.5, -0.5, -0.5, -0.6, -0.6],
  25: [-0.3, -0.4, -0.4, -0.5, -0.5, -0.6, -0.6, -0.7, -0.7, -0.8],
  26: [-0.4, -0.4, -0.5, -0.5, -0.6, -0.7, -0.7, -0.8, -0.9, -0.9],
  27: [-0.4, -0.5, -0.5, -0.6, -0.7, -0.8, -0.8, -0.9, -1.0, -1.1],
  28: [-0.5, -0.5, -0.6, -0.7, -0.8, -0.9, -1.0, -1.0, -1.1, -1.2],
  29: [-0.5, -0.6, -0.7, -0.8, -0.9, -1.0, -1.1, -1.2, -1.3, -1.4],
  30: [-0.6, -0.6, -0.7, -0.8, -1.0, -1.1, -1.2, -1.3, -1.4, -1.5],
}

/**
 * Gets the ABV range index for a given ABV value
 */
function getAbvRangeIndex(abv: number): number {
  for (let i = 0; i < ABV_RANGES.length; i++) {
    const [min, max] = ABV_RANGES[i]
    if (abv >= min && abv <= max) {
      return i
    }
  }
  // Default to highest range for values > 100
  return ABV_RANGES.length - 1
}

/**
 * Gets the correction value from the table with interpolation
 * @param readingAbv - The ABV reading from the hydrometer
 * @param tempC - Actual temperature of the liquid
 * @returns Correction value and calculation details
 */
export function getHydrometerCorrection(
  readingAbv: number,
  tempC: number
): {
  correction: number
  trueAbv: number
  abvRange: string
  tempRounded: number
  interpolated: boolean
} {
  // Get ABV range
  const rangeIndex = getAbvRangeIndex(readingAbv)
  const abvRange = ABV_RANGES[rangeIndex][2]

  // Clamp temperature to table range
  const tempClamped = Math.max(10, Math.min(30, tempC))

  // Get the two nearest integer temperatures
  const tempLow = Math.floor(tempClamped)
  const tempHigh = Math.ceil(tempClamped)

  let correction: number
  let interpolated = false

  if (
    tempLow === tempHigh ||
    !CORRECTION_TABLE[tempLow] ||
    !CORRECTION_TABLE[tempHigh]
  ) {
    // Exact temperature or edge case
    const nearestTemp = Math.round(tempClamped)
    correction = CORRECTION_TABLE[nearestTemp]?.[rangeIndex] ?? 0
  } else {
    // Linear interpolation between temperatures
    const corrLow = CORRECTION_TABLE[tempLow][rangeIndex]
    const corrHigh = CORRECTION_TABLE[tempHigh][rangeIndex]
    const fraction = tempClamped - tempLow
    correction = corrLow + (corrHigh - corrLow) * fraction
    interpolated = true
  }

  // Round to 1 decimal place
  correction = Math.round(correction * 10) / 10

  const trueAbv = Math.round((readingAbv + correction) * 10) / 10

  return {
    correction,
    trueAbv,
    abvRange,
    tempRounded: Math.round(tempClamped),
    interpolated,
  }
}

/**
 * Corrects hydrometer reading for temperature using table lookup
 * This matches the standard correction tables used by distillers
 * @param readingAbv - The ABV reading from the hydrometer
 * @param tempC - Actual temperature of the liquid
 * @returns True ABV at 20°C and calculation details
 */
export function correctHydrometerReading(
  readingAbv: number,
  tempC: number
): {
  trueAbv: number
  correction: number
  abvRange: string
  tempUsed: number
  interpolated: boolean
  outsideTableRange: boolean
} {
  const outsideTableRange = tempC < 10 || tempC > 30

  const result = getHydrometerCorrection(readingAbv, tempC)

  return {
    trueAbv: result.trueAbv,
    correction: result.correction,
    abvRange: result.abvRange,
    tempUsed: result.tempRounded,
    interpolated: result.interpolated,
    outsideTableRange,
  }
}

/**
 * Validates temperature is within safe range for measurements
 * @param tempC - Temperature in Celsius
 * @returns Warning level and message
 */
export function validateTemperature(tempC: number): {
  isValid: boolean
  warning: 'none' | 'caution' | 'danger'
  message: string
} {
  if (tempC < 10 || tempC > 30) {
    return {
      isValid: false,
      warning: 'danger',
      message: 'Temperatura fuera de rango seguro (10-30°C)',
    }
  }
  if (tempC < 15 || tempC > 25) {
    return {
      isValid: true,
      warning: 'caution',
      message: 'Temperatura alejada del estándar (20°C)',
    }
  }
  return {
    isValid: true,
    warning: 'none',
    message: '',
  }
}
