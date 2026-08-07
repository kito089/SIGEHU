import { ApplicationConfig, ErrorHandler, LOCALE_ID, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { loggingInterceptor } from './core/interceptors/logging.interceptor';
import { GlobalErrorHandler } from './core/errors/global-error-handler';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // El interceptor de logs va al final (más interno) para medir el tiempo real
    // de la llamada HTTP y observar la petición ya autenticada.
    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor, loadingInterceptor, loggingInterceptor])
    ),
    importProvidersFrom(FormsModule),
    { provide: LOCALE_ID, useValue: 'es-MX' },
    { provide: ErrorHandler, useClass: GlobalErrorHandler }
  ]
};
