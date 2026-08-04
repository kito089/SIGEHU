import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-editar-cliente',
  templateUrl: './editar-cliente.component.html',
  styleUrls: ['./editar-cliente.component.css']
})
export class EditarClienteComponent implements OnInit {
  // Estado inicial del switch de datos fiscales
  requiereFactura: boolean = true;

  constructor() {}

  ngOnInit(): void {
    // Aquí se cargaría la información del cliente desde el backend/servicio
  }
}