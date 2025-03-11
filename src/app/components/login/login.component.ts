import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/AuthService';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string = '';
  
  // Almacena la referencia al timer para poder cancelarlo si fuera necesario
  private errorTimer: any;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      usuario: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    const { usuario, password } = this.loginForm.value;

    this.authService.login(usuario, password).subscribe({
      next: (resp) => {
        // Limpia el mensaje de error y cualquier timer previo
        this.clearError();
        // Redirige en caso de éxito
        this.router.navigate(['/principal']);
      },
      error: (err) => {
        // Limpia cualquier timer previo para reiniciar la cuenta
        this.clearError();

        if (err.status === 400) {
          this.errorMessage = 'Credenciales inválidas. Por favor, verifica tu usuario y contraseña.';
        } else {
          this.errorMessage = 'Ocurrió un error inesperado. Inténtalo nuevamente.';
        }

        // Programa la limpieza del mensaje de error a los 10s
        this.errorTimer = setTimeout(() => {
          this.errorMessage = '';
        }, 10000);
      }
    });
  }

  private clearError(): void {
    // Si había un timer activo, lo limpiamos
    if (this.errorTimer) {
      clearTimeout(this.errorTimer);
      this.errorTimer = null;
    }
    // Reseteamos el mensaje de error
    this.errorMessage = '';
  }
}