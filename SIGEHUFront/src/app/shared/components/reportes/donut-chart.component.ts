import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DonutDatum, CHART_DEFAULT_COLOR, formatNumber } from './chart.types';

/**
 * Gráfica de dona (SVG) con leyenda y porcentajes. Ideal para distribuciones
 * por estado, garantías por estado o kits más utilizados.
 * Respeta la paleta --sigehu-* (flat, sin sombras).
 */
@Component({
  selector: 'app-chart-donut',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './donut-chart.component.html',
  styleUrl: './donut-chart.component.scss',
})
export class DonutChartComponent {
  data = input.required<DonutDatum[]>();
  /** Texto del centro de la dona (p. ej., total). */
  centerLabel = input<string>('');

  private readonly RADIUS = 15.9;
  private readonly CENTER = 20;

  readonly total = computed(() =>
    this.data().reduce((acc, d) => acc + Math.max(0, Number(d.value) || 0), 0)
  );

  readonly circumference = computed(() => 2 * Math.PI * this.RADIUS);

  /** Segmentos con fracciones acumuladas para stroke-dasharray/offset. */
  readonly segments = computed(() => {
    const total = this.total();
    let acum = 0;
    return this.data().map((d) => {
      const value = Math.max(0, Number(d.value) || 0);
      const fracc = total > 0 ? value / total : 0;
      const start = total > 0 ? acum / total : 0;
      acum += value;
      return {
        label: d.label,
        value,
        pct: Math.round(fracc * 1000) / 10,
        color: d.color || CHART_DEFAULT_COLOR,
        dash: `${fracc * this.circumference()} ${this.circumference()}`,
        offset: -start * this.circumference(),
      };
    });
  });

  protected readonly formatNumber = formatNumber;
}