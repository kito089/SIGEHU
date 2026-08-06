import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StackCategory, CHART_DEFAULT_COLOR, formatNumber } from './chart.types';

/**
 * Barras apiladas (100% horizontal). Ideal para comparar el uso de
 * materiales por obra o reparto por proyecto en "Materiales por Kit",
 * "Proveedores usados" y "Uso de materiales".
 */
@Component({
  selector: 'app-chart-stacked',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stacked-bar-chart.component.html',
  styleUrl: './stacked-bar-chart.component.scss',
})
export class StackedBarChartComponent {
  data = input.required<StackCategory[]>();
  /** Máximo de categorías a mostrar (0 = todas). */
  limit = input<number>(0);

  readonly categories = computed(() => {
    const max = this.limit() > 0 ? this.limit() : this.data().length;
    return this.data().slice(0, max);
  });

  readonly maxTotal = computed(() =>
    Math.max(
      1,
      ...this.categories().map((c) =>
        c.series.reduce((acc, s) => acc + Math.abs(Number(s.value) || 0), 0)
      )
    )
  );

  protected readonly formatNumber = formatNumber;

  protected totalOf(cat: StackCategory): number {
    return cat.series.reduce((acc, s) => acc + Math.abs(Number(s.value) || 0), 0);
  }

  protected seriesNames(): string[] {
    const names = new Set<string>();
    for (const cat of this.categories()) {
      for (const seg of cat.series) names.add(seg.name);
    }
    return [...names];
  }

  protected colorOf(name: string): string {
    for (const cat of this.categories()) {
      const seg = cat.series.find((s) => s.name === name);
      if (seg?.color) return seg.color;
    }
    return CHART_DEFAULT_COLOR;
  }

  protected segmentStyle(seg: { value: number; color?: string }): Record<string, string> {
    return {
      '--seg-width': `${(Math.abs(Number(seg.value) || 0) / this.maxTotal()) * 100}%`,
      '--seg-color': seg.color || CHART_DEFAULT_COLOR,
    };
  }
}