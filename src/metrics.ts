// src/metrics.ts
// Versión neutra (no-op) para evitar errores de tipo y compilar sin analíticas.
// Más adelante podemos cambiarla por integración real (GA4, Plausible, etc.)

export type MetricPayload = {
  name: string
  value?: number
  label?: string
  extra?: Record<string, unknown>
}

/** Registra una métrica (no-op). */
export function trackMetric(_payload: MetricPayload): void {
  // Intencionadamente vacío
}

/** Registra una vista de página (no-op). */
export function pageview(path?: string): void {
  // Si alguien pasa undefined, lo normalizamos a cadena para evitar ts(2345)
  const _p = path ?? '';
  void _p;
}

/** Inicializa métricas (no-op). */
export function initMetrics(): void {
  // Intencionadamente vacío
}
