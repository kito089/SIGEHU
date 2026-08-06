import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LineDatum, CHART_DEFAULT_COLOR, formatNumber } from './chart.types';

const W = 320;
const H = 180;
const PAD_L = 40;
const PAD_R = 12;
const PAD_T = 14;
const PAD_B = 34;

interface Point {
  x: number;
  y: number;
  label: string;
  value: number;
}

/**
 * Gráfica de líneas / evolución en el tiempo (SVG). Ideal para
 * "Evolución de obras" con agrupación por día, semana, mes o año.
 */
@Component({
  selector: 'app-chart-line',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './line-chart.component.html',
  styleUrl: './line-chart.component.scss',
})
export class LineChartComponent {
  data = input.required<LineDatum[]>();
  color = input<string>(CHART_DEFAULT_COLOR);
  /** Cantidad máxima de etiquetas en el eje X. */
  maxLabels = input<number>(6);

  readonly linePath = computed(() => {
    const pts = this.buildPoints();
    if (!pts.length) return '';
    return pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
  });

  readonly areaPath = computed(() => {
    const pts = this.buildPoints();
    if (!pts.length) return '';
    const p0 = pts[0];
    const pN = pts[pts.length - 1];
    const yBase = PAD_T + this.plotH();
    return `${this.linePath()} L ${pN.x} ${yBase} L ${p0.x} ${yBase} Z`;
  });

  readonly xTicks = computed(() => {
    const pts = this.buildPoints();
    const n = Math.max(1, this.maxLabels());
    const step = pts.length > n ? Math.ceil(pts.length / n) : 1;
    return pts.filter((_, i) => i % step === 0);
  });

  readonly points = computed(() => this.buildPoints());

  readonly gridLines = computed(() => {
    const plotH = H - PAD_T - PAD_B;
    return [0.25, 0.5, 0.75, 1].map((g) => ({
      y: PAD_T + plotH * (1 - g),
    }));
  });

  protected readonly formatNumber = formatNumber;

  private buildPoints(): Point[] {
    const data = this.data();
    if (!data?.length) return [];
    const plotW = W - PAD_L - PAD_R;
    const plotH = H - PAD_T - PAD_B;
    const max = Math.max(1, ...data.map((d) => Math.abs(Number(d.value) || 0)));
    const n = data.length;
    return data.map((d, i) => {
      const x = PAD_L + (n === 1 ? 0 : (i / (n - 1)) * plotW);
      const y = PAD_T + plotH - (Math.abs(Number(d.value) || 0) / max) * plotH;
      return {
        x,
        y,
        label: d.label,
        value: Number(d.value) || 0,
      };
    });
  }

  private plotH(): number {
    return H - PAD_T - PAD_B;
  }
}