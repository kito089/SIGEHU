import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { provideIonicAngular } from '@ionic/angular/standalone';

const providers = [...appConfig.providers, provideIonicAngular()];

bootstrapApplication(AppComponent, { providers });