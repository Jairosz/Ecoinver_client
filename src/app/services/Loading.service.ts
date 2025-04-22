import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loading = new BehaviorSubject<boolean>(false);
  private message = new BehaviorSubject<string>('');

  constructor() { }

  show(message: string = 'Cargando...'): void {
    this.message.next(message);
    this.loading.next(true);
  }

  hide(): void {
    this.loading.next(false);
  }

  isLoading(): Observable<boolean> {
    return this.loading.asObservable();
  }

  getMessage(): Observable<string> {
    return this.message.asObservable();
  }
}