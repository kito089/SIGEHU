import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-error-page',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './error-page.component.html',
  styleUrls: ['./error-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorPageComponent {
  @Input() code: '404' | '500' = '404';

  private messages: Record<'404' | '500', { title: string; message: string }> = {
    '404': {
      title: 'Página no encontrada',
      message: 'Parece que esta página no existe en SIGEHU'
    },
    '500': {
      title: 'Error del servidor',
      message: 'Ha ocurrido un error interno del servidor. Intente de nuevo más tarde.'
    }
  };

  get current(): { title: string; message: string } {
    return this.messages[this.code];
  }

  private router = inject(Router);

  goBack(): void {
    this.router.navigate(['/login']);
  }
}