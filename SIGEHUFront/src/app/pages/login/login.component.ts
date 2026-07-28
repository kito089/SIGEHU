import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true,
  imports: [FormsModule]
})
export class LoginComponent {
  login = { usuario: '', contrasena: '', recordarSesion: false };

  constructor(private router: Router) {}

  onLogin(event: Event) {
    event.preventDefault();
    this.router.navigate(['/dashboard']);
  }

  forgotPasswordMessage() {
    alert("Comunicarse con el administrador para cambiar la contraseña");
  }
}
