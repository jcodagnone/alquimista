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
  [1, 1, 0.16911721], [1, 2, -0.00001026186], [1, 3, -0.0000010859217],
  [1, 4, -0.000000018586393], [1, 5, 0.00000000059363544],
  [2, 1, -0.20369835], [2, 2, 0.0031222004], [2, 3, -0.00012314599],
  [2, 4, 0.000001630665], [2, 5, -0.000000011111394],
  [3, 1, 0.71175079], [3, 2, -0.013656474], [3, 3, 0.00059376345],
  [3, 4, -0.000008613356], [3, 5, 0.000000061058245],
  [4, 1, -1.2443657], [4, 2, 0.027466369], [4, 3, -0.001487506],
  [4, 4, 0.000024603699], [4, 5, -0.00000018428128],
  [5, 1, 0.89234477], [5, 2, -0.03588147], [5, 3, 0.0021359045],
  [5, 4, -0.000041698377], [5, 5, 0.00000033301956],
  [6, 1, -0.22211216], [6, 2, 0.023377377], [6, 3, -0.0017755628],
  [6, 4, 0.000040143198], [6, 5, -0.00000035418367]
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

export function calculateDensity(abv: number, tempC: number): number {
  const p = abvToMassFraction(abv);
  return parseFloat((rho_p_t(p, tempC) / 1000).toFixed(6));
}

export function calculateWaterDensity(tempC: number): number {
  return calculateDensity(0, tempC);
}

export function calculateEthanolDensity(tempC: number): number {
  return calculateDensity(100, tempC);
}

export function massFractionToAbv(massFrac: number): number {
  const rho = rho_p_t(massFrac, 20);
  return (massFrac * rho / RHO_ETH_20) * 100;
}

export function calculateVolumeFromMass(massG: number, abv: number, tempC: number) {
  const density = calculateDensity(abv, tempC);
  return { volumeMl: parseFloat((massG / density).toFixed(2)), density };
}

export function calculateEthanolMass(volumeMl: number, abv: number, tempC: number) {
  const density = calculateDensity(abv, tempC);
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
  const targetRho = rho_p_t(abvToMassFraction(readingAbv), 20);
  let low = 0, high = 100, trueAbv = 50;
  for (let i = 0; i < 30; i++) {
    trueAbv = (low + high) / 2;
    const rho = rho_p_t(abvToMassFraction(trueAbv), tempC);
    if (rho > targetRho) low = trueAbv; else high = trueAbv;
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
