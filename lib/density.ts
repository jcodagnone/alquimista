/**
 * OIML R 22 Density Calculations for Ethanol-Water Mixtures
 * Official coefficients from OIML R 22 (1975)
 */

const RHO_ETH_20 = 789.24; // kg/m3

// Table 2: Coefficients A_k (Density at 20°C)
const A = [
  998.20123,
  -192.9769495,
  389.1238958,
  -1668.103923,
  13522.15441,
  -88292.78388,
  306287.4042,
  -613838.1234,
  747017.2998,
  -547846.1354,
  223446.0334,
  -39032.85426
];

// Table 3: Coefficients B_k (Water density temperature correction)
const B = [
  0,
  -0.20618513,
  -0.0052682542,
  0.000036130013,
  -0.00000038957702,
  0.000000007169354,
  -0.000000000099739231
];

// Table 4: Coefficients C_i,j (Cross terms)
const C: [number, number, number][] = [
  [1, 1, -1.161156], [2, 1, 1.35032], [3, 1, -2.16274],
  [4, 1, 3.65593], [5, 1, -4.13781], [6, 1, 1.7611],
  [1, 2, 0.01017], [2, 2, -0.038437], [3, 2, 0.089056],
  [4, 2, -0.147321], [5, 2, 0.146237], [6, 2, -0.060122],
  [1, 3, 0.00018844], [2, 3, 0.00052018], [3, 3, -0.0035042],
  [4, 3, 0.0076163], [5, 3, -0.0083697], [6, 3, 0.0035687],
  [1, 4, -0.000020673], [2, 4, 0.000085273], [3, 4, -0.00019806],
  [4, 4, 0.00039634], [5, 4, -0.00043168], [6, 4, 0.00020002],
  [1, 5, 0.000000134], [2, 5, -0.00000134], [3, 5, 0.00000522],
  [4, 5, -0.00000939], [5, 5, 0.00000796], [6, 5, -0.00000258]
];

function rho_p_t(p: number, t: number): number {
  const dt = t - 20;
  let rho = 0;
  for (let k = 0; k < A.length; k++) rho += A[k] * Math.pow(p, k);
  for (let k = 1; k < B.length; k++) rho += B[k] * Math.pow(dt, k);
  for (const [i, j, val] of C) rho += val * Math.pow(p, i) * Math.pow(dt, j);
  return rho;
}

export function abvToMassFraction(abv: number): number {
  if (abv <= 0) return 0;
  if (abv >= 100) return 1;
  const targetV = abv / 100;
  let low = 0, high = 1, p = 0.5;
  for (let i = 0; i < 40; i++) {
    p = (low + high) / 2;
    const v = (p * rho_p_t(p, 20)) / RHO_ETH_20;
    if (v < targetV) low = p; else high = p;
  }
  return p;
}

export function calculateDensity(abv: number, tempC: number) {
  const p = abvToMassFraction(abv);
  const rho = rho_p_t(p, tempC) / 1000;
  
  // Contraction factor calculation:
  // (V_water + V_ethanol) / V_mixture
  // For 1g of mixture: 
  // V_mixture = 1 / rho
  // V_ethanol = p / rho_eth_T
  // V_water = (1-p) / rho_wat_T
  const rho_eth = rho_p_t(1, tempC) / 1000;
  const rho_wat = rho_p_t(0, tempC) / 1000;
  const v_eth = p / rho_eth;
  const v_wat = (1 - p) / rho_wat;
  const v_mix = 1 / rho;
  const contractionFactor = (v_eth + v_wat) / v_mix;

  return { 
    density: parseFloat(rho.toFixed(6)), 
    contractionFactor: parseFloat(contractionFactor.toFixed(6)) 
  };
}

export function calculateWaterDensity(tempC: number): number {
  return calculateDensity(0, tempC).density;
}

export function calculateEthanolDensity(tempC: number): number {
  return calculateDensity(100, tempC).density;
}

export function massFractionToAbv(massFrac: number): number {
  const rho = rho_p_t(massFrac, 20);
  return (massFrac * rho / RHO_ETH_20) * 100;
}

export function calculateVolumeFromMass(massG: number, abv: number, tempC: number) {
  const { density, contractionFactor } = calculateDensity(abv, tempC);
  return { volumeMl: parseFloat((massG / density).toFixed(2)), density, contractionFactor };
}

export function calculateEthanolMass(volumeMl: number, abv: number, tempC: number) {
  const { density } = calculateDensity(abv, tempC);
  const massFrac = abvToMassFraction(abv);
  return parseFloat((volumeMl * density * massFrac).toFixed(2));
}

export function calculateDilutionWater(sourceMassG: number, sourceAbv: number, targetAbv: number) {
  const p1 = abvToMassFraction(sourceAbv);
  const p2 = abvToMassFraction(targetAbv);
  const m2 = (sourceMassG * p1) / p2;
  return {
    waterToAddG: parseFloat((m2 - sourceMassG).toFixed(1)),
    finalMassG: parseFloat(m2.toFixed(1)),
    ethanolMassG: parseFloat((sourceMassG * p1).toFixed(2)),
    sourceMassFraction: parseFloat(p1.toFixed(4)),
    targetMassFraction: parseFloat(p2.toFixed(4)),
  };
}

export function getHydrometerCorrection(readingAbv: number, tempC: number) {
  // OIML R 22 Section 14: Hydrometers
  // rho(V', 20) = rho(q, t) * [1 - alpha * (t - 20)]
  // alpha for soda-lime glass = 0.000025
  const ALPHA = 0.000025;
  const targetRho = rho_p_t(abvToMassFraction(readingAbv), 20);
  const correctedRho = targetRho / (1 - ALPHA * (tempC - 20));
  
  let low = 0, high = 100, trueAbv = 50;
  for (let i = 0; i < 30; i++) {
    trueAbv = (low + high) / 2;
    const rho = rho_p_t(abvToMassFraction(trueAbv), tempC);
    if (rho > correctedRho) low = trueAbv; else high = trueAbv;
  }
  
  const abvInt = Math.floor(readingAbv / 10) * 10;
  const abvRange = `${abvInt}-${abvInt + 10}`;

  return { 
    correction: parseFloat((trueAbv - readingAbv).toFixed(1)), 
    trueAbv: parseFloat(trueAbv.toFixed(1)),
    abvRange,
    tempRounded: Math.round(tempC),
    interpolated: true // Now everything is mathematically interpolated
  };
}

export function correctHydrometerReading(readingAbv: number, tempC: number) {
  const result = getHydrometerCorrection(readingAbv, tempC);
  return { 
    ...result, 
    outsideTableRange: tempC < 10 || tempC > 30,
    tempUsed: result.tempRounded
  };
}

export function validateTemperature(tempC: number) {
  if (tempC < 10 || tempC > 30) return { isValid: false, warning: 'danger', message: 'Temperatura fuera de rango (10-30°C)' };
  return { isValid: true, warning: tempC < 15 || tempC > 25 ? 'caution' : 'none', message: '' };
}
