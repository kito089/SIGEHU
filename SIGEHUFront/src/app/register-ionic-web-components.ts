import { defineCustomElement as defineIonBadge } from '@ionic/core/components/ion-badge.js';
import { defineCustomElement as defineIonButton } from '@ionic/core/components/ion-button.js';
import { defineCustomElement as defineIonCard } from '@ionic/core/components/ion-card.js';
import { defineCustomElement as defineIonCardContent } from '@ionic/core/components/ion-card-content.js';
import { defineCustomElement as defineIonCardHeader } from '@ionic/core/components/ion-card-header.js';
import { defineCustomElement as defineIonCardSubtitle } from '@ionic/core/components/ion-card-subtitle.js';
import { defineCustomElement as defineIonCardTitle } from '@ionic/core/components/ion-card-title.js';
import { defineCustomElement as defineIonCheckbox } from '@ionic/core/components/ion-checkbox.js';
import { defineCustomElement as defineIonChip } from '@ionic/core/components/ion-chip.js';
import { defineCustomElement as defineIonContent } from '@ionic/core/components/ion-content.js';
import { defineCustomElement as defineIonHeader } from '@ionic/core/components/ion-header.js';
import { defineCustomElement as defineIonIcon } from 'ionicons/components/ion-icon.js';
import { defineCustomElement as defineIonInput } from '@ionic/core/components/ion-input.js';
import { defineCustomElement as defineIonItem } from '@ionic/core/components/ion-item.js';
import { defineCustomElement as defineIonLabel } from '@ionic/core/components/ion-label.js';
import { defineCustomElement as defineIonList } from '@ionic/core/components/ion-list.js';
import { defineCustomElement as defineIonProgressBar } from '@ionic/core/components/ion-progress-bar.js';
import { defineCustomElement as defineIonSegment } from '@ionic/core/components/ion-segment.js';
import { defineCustomElement as defineIonSegmentButton } from '@ionic/core/components/ion-segment-button.js';
import { defineCustomElement as defineIonSelect } from '@ionic/core/components/ion-select.js';
import { defineCustomElement as defineIonSelectOption } from '@ionic/core/components/ion-select-option.js';
import { defineCustomElement as defineIonSpinner } from '@ionic/core/components/ion-spinner.js';
import { defineCustomElement as defineIonTextarea } from '@ionic/core/components/ion-textarea.js';
import { defineCustomElement as defineIonTitle } from '@ionic/core/components/ion-title.js';
import { defineCustomElement as defineIonToolbar } from '@ionic/core/components/ion-toolbar.js';

const defaultTags: ReadonlyArray<readonly [string, () => void]> = [
  ['ion-badge', defineIonBadge],
  ['ion-button', defineIonButton],
  ['ion-card', defineIonCard],
  ['ion-card-content', defineIonCardContent],
  ['ion-card-header', defineIonCardHeader],
  ['ion-card-subtitle', defineIonCardSubtitle],
  ['ion-card-title', defineIonCardTitle],
  ['ion-checkbox', defineIonCheckbox],
  ['ion-chip', defineIonChip],
  ['ion-content', defineIonContent],
  ['ion-header', defineIonHeader],
  ['ion-icon', defineIonIcon],
  ['ion-input', defineIonInput],
  ['ion-item', defineIonItem],
  ['ion-label', defineIonLabel],
  ['ion-list', defineIonList],
  ['ion-progress-bar', defineIonProgressBar],
  ['ion-segment', defineIonSegment],
  ['ion-segment-button', defineIonSegmentButton],
  ['ion-select', defineIonSelect],
  ['ion-select-option', defineIonSelectOption],
  ['ion-spinner', defineIonSpinner],
  ['ion-textarea', defineIonTextarea],
  ['ion-title', defineIonTitle],
  ['ion-toolbar', defineIonToolbar],
];

/**
 * Registers the Ionic web components used by SIGEHUFront against
 * `customElements` using the static CE build of `@ionic/core` and
 * `ionicons`. Each registration is idempotent and self-contained, so
 * no external chunks, CDN resources or dynamic imports are required.
 */
export function registerIonicWebComponents(): void {
  if (typeof customElements === 'undefined') {
    return;
  }
  for (const [tagName, define] of defaultTags) {
    try {
      if (!customElements.get(tagName)) {
        define();
      }
    } catch (error) {
      console.error(`[SIGEHU] No se pudo registrar el web component <${tagName}>`, error);
    }
  }
}