import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  BarDatum,
  BarOrientation,
  CHART_DEFAULT_COLOR,
  formatNumber,
} from './chart.types';

/**
 * Gráfica de barras (vertical u horizontal). Se renderiza con bloques
 * dimensionados con porcentajes relativos al máximo, sin SVG, para mantener
 * el estilo flat y el rendimiento con listas largas.
 */
@Component({
  selector: 'app-chart-bars',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bar-chart.component.html',
  styleUrl: './bar-chart.component.scss',
})
export class BarChartComponent {
  data = input.required<BarDatum[]>();
  orientation = input<BarOrientation>('vertical');
  /** Máximo de valores a mostrar (0 = todos). */
  limit = input<number>(0);
  /** Formato del valor: 'number' | 'days' (apéndice "días"). */
  unit = input<'number' | 'days'>('number');

  private readonly defaultColor = CHART_DEFAULT_COLOR;

  readonly items = computed(() => {
    const max = this.limit() > 0 ? this.limit() : this.data().length;
    return this.data().slice(0, max);
  });

  readonly maxValue = computed(() =>
    Math.max(1, ...this.items().map((d) => Math.abs(Number(d.value) || 0)))
  );

  protected readonly formatNumber = formatNumber;

  protected barStyle(item: BarDatum): Record<string, string> {
    const pct = (Math.abs(Number(item.value) || 0) / this.maxValue()) * 100;
    return {
      '--bar-metric': `${Math.max(pct, 1)}%`,
      '--bar-color': item.color || CHART_DEFAULT_COLOR,
    };
  }

  protected displayValue(item: BarDatum): string {
    const n = Number(item.value) || 0;
    const base = formatNumber(n);
    return this.unit() === 'days' ? `${base} ${n === 1 ? 'día' : 'días'}` : base;
  }
}