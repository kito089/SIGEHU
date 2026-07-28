import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ClientForm {
  name: string;
  phone: string;
  email: string;
  requiresInvoice: boolean;
  rfc?: string;
  taxRegime?: string;
  postalCode?: string;
}

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.css']
})
export class ClientesComponent {
  client: ClientForm = {
    name: '',
    phone: '',
    email: '',
    requiresInvoice: false,
    rfc: '',
    taxRegime: '',
    postalCode: ''
  };

  saveClient(): void {
    if (!this.client.name || !this.client.phone) {
      alert('Por favor completa los campos obligatorios (*)');
      return;
    }

    if (this.client.requiresInvoice && (!this.client.rfc || !this.client.taxRegime || !this.client.postalCode)) {
      alert('Por favor completa la información fiscal obligatoria.');
      return;
    }

    console.log('Guardando Cliente:', this.client);
    alert('Cliente guardado exitosamente.');
  }

  cancel(): void {
    console.log('Operación cancelada');
  }
}
