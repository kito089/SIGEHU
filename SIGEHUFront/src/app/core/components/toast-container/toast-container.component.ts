import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ToastService, ToastItem } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-container.component.html',
  styleUrls: ['./toast-container.component.css'],
})
export class ToastContainerComponent implements OnInit, OnDestroy {
  toasts: ToastItem[] = [];
  private subscription: Subscription | null = null;
  private timers = new Map<number, ReturnType<typeof setTimeout>>();

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.subscription = this.toastService.toasts$.subscribe(items => {
      this.toasts = items;
      items.forEach(t => this.programarCierre(t));
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }

  private programarCierre(toast: ToastItem): void {
    if (this.timers.has(toast.id)) return;
    const timer = setTimeout(() => {
      this.toastService.dismiss(toast.id);
      this.timers.delete(toast.id);
    }, toast.duration);
    this.timers.set(toast.id, timer);
  }

  cerrar(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.toastService.dismiss(id);
  }
}