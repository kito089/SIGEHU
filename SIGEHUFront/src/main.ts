import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  searchOutline,
  personOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline,
  alertCircleOutline,
  peopleOutline,
  constructOutline,
  cubeOutline,
  trashOutline,
  add,
  close,
  checkmarkCircle,
  closeCircle,
  informationCircle,
  warning,
  helpCircleOutline,
  chevronDownOutline,
  settingsOutline,
  logOutOutline,
  notificationsOutline,
  checkmarkCircleOutline,
  timeOutline,
  calendarOutline,
  listOutline,
  copyOutline,
  personCircleOutline,
} from 'ionicons/icons';

addIcons({
  'search-outline': searchOutline,
  'person-outline': personOutline,
  'lock-closed-outline': lockClosedOutline,
  'eye-outline': eyeOutline,
  'eye-off-outline': eyeOffOutline,
  'alert-circle-outline': alertCircleOutline,
  'people-outline': peopleOutline,
  'construct-outline': constructOutline,
  'cube-outline': cubeOutline,
  'trash-outline': trashOutline,
  add,
  close,
  'checkmark-circle': checkmarkCircle,
  'close-circle': closeCircle,
  'information-circle': informationCircle,
  warning,
  'help-circle-outline': helpCircleOutline,
  'chevron-down-outline': chevronDownOutline,
  'settings-outline': settingsOutline,
  'log-out-outline': logOutOutline,
  'notifications-outline': notificationsOutline,
  'checkmark-circle-outline': checkmarkCircleOutline,
  'time-outline': timeOutline,
  'calendar-outline': calendarOutline,
  'list-outline': listOutline,
  'copy-outline': copyOutline,
  'person-circle-outline': personCircleOutline,
});

const providers = [...appConfig.providers, provideIonicAngular()];

bootstrapApplication(AppComponent, { providers });