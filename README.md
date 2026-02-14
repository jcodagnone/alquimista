# El Alquimista

Calculadora técnica para las diferentes etapas de una destilación artesanal, con enfoque en precisión alcoholométrica.

## Secciones de la Aplicación

La aplicación se divide en cuatro módulos críticos basados en la norma internacional **OIML R 22**:

1.  **Cálculo de Densidad:** Determina la densidad real ($\rho$) de una mezcla hidroalcohólica en función de su graduación (ABV) y temperatura, utilizando el modelo matemático de Wagenbreth-Blanke.
2.  **Corrección de Alcoholímetro:** Ajusta la lectura visual de un densímetro/alcoholímetro según la temperatura de la muestra para obtener el valor real a 20°C.
3.  **Dilución Gravimétrica:** Calcula con precisión el agua necesaria para diluir un espíritu hasta la graduación deseada. Prioriza el peso (gramos) sobre el volumen para evitar errores por contracción de mezcla.
4.  **Conversión de Masa a Volumen:** Permite obtener volúmenes exactos a partir del pesaje, fundamental para trasvases y embotellado de precisión.

## Base Científica

Todos los cálculos utilizan la recomendación internacional **OIML R 22** con los 60 coeficientes del modelo de **Wagenbreth & Blanke (1971)**, garantizando una precisión de grado laboratorio superior a las aplicaciones comerciales estándar.

## Comenzando

### Requisitos

- Node.js 18+
- pnpm

### Instalación

```bash
pnpm install
```

### Desarrollo

```bash
pnpm dev
```

### Pruebas

```bash
pnpm test
```

### Construcción para Producción

```bash
pnpm build
```

---

*Desarrollado con enfoque en el rigor científico y la facilidad de uso en el entorno de destilería.*
