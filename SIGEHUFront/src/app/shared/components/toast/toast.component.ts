import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ToastItem, ToastType } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);

  @Input() toast!: ToastItem;
  @Output() dismissed = new EventEmitter<number>();

  private timer: ReturnType<typeof setTimeout> | null = null;

  get icon(): string {
    const icons: Record<ToastType, string> = {
      success: 'checkmark-circle',
      warning: 'warning',
      error: 'close-circle',
      info: 'information-circle'
    };
    return icons[this.toast.type] || 'information-circle';
  }

  ngOnInit(): void {
    if (this.toast.duration > 0) {
      this.timer = setTimeout(() => this.dismissed.emit(this.toast.id), this.toast.duration);
    }
  }

  ngOnDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }
}