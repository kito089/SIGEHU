/**
 * Tipos compartidos para los componentes de gráficas del módulo de Reportes.
 * Se usan tokens --sigehu-* para respetar el sistema de diseño (DISEÑO_UI.md).
 */

export interface DonutDatum {
  label: string;
  value: number;
  color: string;
}

export interface BarDatum {
  label: string;
  value: number;
  color: string;
}

export type BarOrientation = 'vertical' | 'horizontal';

export interface LineDatum {
  label: string;
  value: number;
}

export interface StackSegment {
  name: string;
  value: number;
  color: string;
}

export interface StackCategory {
  category: string;
  series: StackSegment[];
}

/** Paleta por defecto para series (alineada con la paleta SIGEHU). */
export const CHART_PALETTE = [
  '#3B82F6', // azul
  '#10B981', // verde
  '#F59E0B', // amarillo
  '#A855F7', // morado
  '#EF4444', // rojo
  '#60A5FA',
  '#34D399',
  '#FBBF24',
  '#C084FC',
  '#F87171',
];

/** Color por defecto cuando un dato no especifica color. */
export const CHART_DEFAULT_COLOR = '#3B82F6';

/** Formato compacto de número (1,234). */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('es-MX');
}