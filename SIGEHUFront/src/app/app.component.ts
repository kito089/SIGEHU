import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { ToastContainerComponent } from './core/components/toast-container/toast-container.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, ToastContainerComponent],
})
export class AppComponent implements OnInit {
  constructor(private router: Router) {}

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
