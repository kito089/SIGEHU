import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private active = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private _visible = false;

  get visible(): boolean { return this._visible; }

  add(): void {
    this.active++;
    if (this.active === 1 && !this.timer) {
      this.timer = setTimeout(() => { this._visible = true; }, 300);
    }
  }

  remove(): void {
    this.active = Math.max(0, this.active - 1);
    if (this.active === 0) {
      if (this.timer) { clearTimeout(this.timer); this.timer = null; }
      this._visible = false;
    }
  }
}