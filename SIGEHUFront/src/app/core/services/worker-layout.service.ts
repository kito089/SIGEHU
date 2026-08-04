import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface WorkerAction {
  label: string;
  icon?: string;
  action: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class WorkerLayoutService {
  private readonly pageTitle = new BehaviorSubject<string>('');
  private readonly actions = new BehaviorSubject<WorkerAction[]>([]);

  readonly pageTitle$ = this.pageTitle.asObservable();
  readonly actions$ = this.actions.asObservable();

  setPageTitle(title: string): void {
    this.pageTitle.next(title);
  }

  setActions(actions: WorkerAction[]): void {
    this.actions.next(actions);
  }

  clearActions(): void {
    this.actions.next([]);
  }
}
