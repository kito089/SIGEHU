import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss']
})
export class ConfirmDialogComponent {
  private confirm = inject(ConfirmService);
  request$ = this.confirm.state$;

  confirmar(): void {
    this.confirm.responder(true);
  }

  cancelar(): void {
    this.confirm.responder(false);
  }
}
