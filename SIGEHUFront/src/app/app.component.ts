import { Component, OnInit, inject } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ToastContainerComponent } from './shared/components/toast/toast-container.component';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [RouterOutlet, ToastContainerComponent, ConfirmDialogComponent],
})
export class AppComponent implements OnInit {
  private router = inject(Router);


  ngOnInit(): void {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        const active = document.activeElement;
        if (active instanceof HTMLElement && active !== document.body) {
          active.blur();
        }
      });
  }
}