import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/Auth.service';
import { CultivoService } from '../../services/Cultivo.service';
import { ComercialServiceService } from '../../services/Comercial.service';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',

})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string = '';
  connectionError: boolean = false;  // <-- variable para "no hay conexión"
  loading: boolean = false;
  private errorTimer: any;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router, private cultivoServicio: CultivoService, private comercialServicio: ComercialServiceService
  ) {
    this.loginForm = this.fb.group({
      usuario: ['', Validators.required],
      password: ['', Validators.required]
    });
  }
  ngOnInit(){
    this.comercialServicio.getClienteErp().subscribe(
  (data)=>{
    console.log(data);
  }      

    );
    this.cultivoServicio.getAll().subscribe(
      (data)=>{
        console.log(data);
      }
    );
  }
  onSubmit(): void {
    if (this.loginForm.invalid) return;
    this.loading = true;  
    const { usuario, password } = this.loginForm.value;

    this.authService.login(usuario, password).subscribe({
      next: (resp) => {
        localStorage.setItem('token', resp.token); // Guarda el token en el localStorage
        localStorage.setItem('userId', resp.userId || "fallo"); // Guarda el token en el localStorage
        this.clearErrors();
        this.router.navigate(['/dashboard'])
      },
      error: (err) => {
        this.clearErrors();
        // Caso: no hay conexión con el servidor
        if (err.status === 0) {
          this.connectionError = true;
          // Opcional: cerrar el mensaje tras 10s
          this.errorTimer = setTimeout(() => {
            this.connectionError = false;
          }, 10000);
        }
        // Caso: credenciales inválidas (400)
        else if (err.status === 400) {
          this.errorMessage = 'Credenciales inválidas. Por favor, verifica tu usuario y contraseña.';
          // Cerrar el mensaje tras 10s
          this.errorTimer = setTimeout(() => {
            this.errorMessage = '';
          }, 10000);
        }
        // Caso: otro tipo de error
        else {
          this.errorMessage = 'Ocurrió un error inesperado. Inténtalo nuevamente.';
          this.errorTimer = setTimeout(() => {
            this.errorMessage = '';
          }, 5000);
        }
      }
    });
  }

  private clearErrors(): void {
    // Limpia cualquier temporizador previo
    if (this.errorTimer) {
      clearTimeout(this.errorTimer);
      this.errorTimer = null;
    }
    // Resetea ambos mensajes
    this.errorMessage = '';
    this.connectionError = false;
  }
}
