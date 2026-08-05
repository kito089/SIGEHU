import { Directive, ElementRef, AfterContentInit, inject, Renderer2 } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Directive({
  selector: '[appFocusTrap]',
  standalone: true
})
export class FocusTrapDirective implements AfterContentInit {
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);

  private firstFocusable?: HTMLElement;
  private lastFocusable?: HTMLElement;

  ngAfterContentInit(): void {
    const focusable = this.el.nativeElement.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    this.firstFocusable = focusable[0] as HTMLElement;
    this.lastFocusable = focusable[focusable.length - 1] as HTMLElement;
    this.firstFocusable?.focus();
    this.renderer.listen(this.el.nativeElement, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (this.document.activeElement === this.firstFocusable) {
            e.preventDefault();
            this.lastFocusable?.focus();
          }
        } else {
          if (this.document.activeElement === this.lastFocusable) {
            e.preventDefault();
            this.firstFocusable?.focus();
          }
        }
      }
    });
  }
}