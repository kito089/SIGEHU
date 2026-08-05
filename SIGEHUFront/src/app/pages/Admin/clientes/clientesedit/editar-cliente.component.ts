import { Component } from '@angular/core';

@Component({
  selector: 'app-editar-cliente',
  templateUrl: './editar-cliente.component.html',
  styleUrls: ['./editar-cliente.component.css']
})
export class EditarClienteComponent {
  // Estado inicial del switch de datos fiscales
  requiereFactura: boolean = true;
}