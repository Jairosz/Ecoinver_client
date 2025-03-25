import { Component, type OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { finalize } from "rxjs/operators"
import  { UsersService, Usuario } from "../../services/Users.service"
import { UpdateUserDTO } from '../../types/UpdateUserDto';
import { RoleResponse } from '../../types/RoleResponse';

//alertas
import { AlertService, AlertType } from '../../services/Alert.service';
@Component({
  selector: "app-users",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./users.component.html",
})
export class UsersComponent implements OnInit {
  Math = Math
  loading = true
  errorMessage = ""

  data: Usuario[] = []
  roles: string[] = [] // Aquí guardaremos los roles
  searchQuery = ""
  itemsPerPage = 5
  currentPage = 1

  filteredData: Usuario[] = []
  paginatedData: Usuario[] = []
  selectedUsuario: Usuario | null = null
  numId: number=0;

  upData : UpdateUserDTO[]=[]

  
  // Variables para alertas
  showAlert: boolean = false;
  alertMessage: string = '';
  alertType: 'success' | 'error' | 'warning' = 'success';
  private alertTimer: any;

  // Propiedades para el modal
  newUser: UpdateUserDTO = {
    nombreCompleto: "",
    userName: "",
    password: "",
    role: "",
    email: ""
  }
  editMode = false
  showModal = false

  showDeleteModal = false; // Para controlar la visibilidad del modal


  constructor(
    private UsersService: UsersService,//Users
    private alertService: AlertService//Alertas
  ) {}

  get totalPages(): number {
    return Math.ceil(this.filteredData.length / this.itemsPerPage)
  }

  ngOnInit(): void {
    this.loadUsers()
    this.loadRoles()
    this.alertService.show({
      message: 'TEST: Alerta funcionando',
      type: 'success',
      duration: 3000
    });
  }

  private loadUsers(): void {
    this.UsersService.getUsuarios()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data: Usuario[]) => {
          this.data = data.map((user) => ({
            ...user,
            showPassword: false,
          }))
          this.filterData()
        },
        error: (err) => {
          console.error("Error al cargar usuarios:", err)
          this.errorMessage = "Error al cargar los usuarios. Por favor, intente de nuevo más tarde."
        },
      })
  }

  private loadRoles(): void {
    this.UsersService.getRoles().subscribe({
      next: (roles: RoleResponse[]) => {
        this.roles = roles.map(role => role.name); // Extrae solo los nombres de los roles
      },
      error: (err) => {
        console.error("Error al cargar los roles:", err);
      },
    });
  }
  

  filterData(): void {
    const query = this.searchQuery.toLowerCase().trim()

    this.filteredData = query
      ? this.data.filter((item) => Object.values(item).some((val) => val?.toString().toLowerCase().includes(query)))
      : [...this.data]

    this.currentPage = 1
    this.selectedUsuario = null
    this.updatePagination()
  }

  updatePagination(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage
    const endIndex = startIndex + this.itemsPerPage
    this.paginatedData = this.filteredData.slice(startIndex, endIndex)
  }

  selectRow(item: Usuario): void {
    this.selectedUsuario = item;
    this.numId = this.selectedUsuario.id;
  }

  togglePasswordVisibility(usuario: Usuario): void {
    usuario.showPassword = !usuario.showPassword
  }

  // Métodos para el modal
  openCreateModal(): void {
    this.editMode = false
    this.newUser = {
      nombreCompleto: "",
      userName: "",
      password: "",
      role: "",
      email: "",
    }
    this.showModal = true
  }

  edit(): void {
    if (this.selectedUsuario) {
      this.editMode = true
      this.newUser = { ...this.selectedUsuario }
      this.showModal = true
    }
  }

//funciones para alertas
  private showAlertMessage(type: 'success' | 'error' | 'warning', message: string, duration: number = 5000): void {
    this.clearAlert();
    this.alertType = type;
    this.alertMessage = message;
    this.showAlert = true;
    
    this.alertTimer = setTimeout(() => {
      this.showAlert = false;
    }, duration);
  }

  private clearAlert(): void {
    if (this.alertTimer) {
      clearTimeout(this.alertTimer);
    }
    this.showAlert = false;
    this.alertMessage = '';
  }






  saveUser(): void {
    // Validación del formulario
    if (!this.isFormValid()) {
      this.showAlertMessage('warning', 'Por favor complete todos los campos requeridos');
      return;
    }

    if (this.editMode) {
      this.UsersService.updateUsuario(this.newUser, this.numId).subscribe({
        next: (updatedUsuario) => {//222222
          this.showAlertMessage('success', 'Usuario actualizado exitosamente', 3000);
        },
        error: (err) => {
          this.showAlertMessage('error', `Error al actualizar: ${err.message}`);
        },
      });
    } else {
      this.UsersService.createUsuario(this.newUser).subscribe({
        next: (newUser) => {
          this.upData.push(newUser);
          this.filterData();
          this.closeModal();
          this.showAlertMessage('success', 'Usuario creado exitosamente', 3000);
        },
        error: (err) => {
          this.showAlertMessage('error', `Error al crear: ${err.message}`);
        },
      });
    }
  }
  
  private isFormValid(): boolean {
    return !!this.newUser.nombreCompleto?.trim() &&
           !!this.newUser.userName?.trim() &&
           !!this.newUser.email?.trim() &&
           !!this.newUser.role?.trim() &&
           (this.editMode || !!this.newUser.password?.trim());
  }

  closeModal(): void {
    this.showModal = false
    this.newUser = {
      nombreCompleto: "",
      userName: "",
      password: "",
      role: "",
      email: "",
      //showPassword: false,
    }
    this.editMode = false
  }

  delete() {
    console.log("Mostrando modal de eliminación");
    
    this.showDeleteModal = true;

  }
  
  

  // Método para confirmar la eliminación
  confirmDelete(): void {
    if (this.selectedUsuario?.id) {
      this.UsersService.deleteUsuario(this.selectedUsuario.id).subscribe({
        next: () => {
          this.data = this.data.filter((u) => u.id !== this.selectedUsuario?.id);
          this.filterData();
          this.selectedUsuario = null;
          this.showDeleteModal = false;
          this.showAlertMessage('success', 'Usuario eliminado exitosamente', 3000);
        },
        error: (err) => {
          this.showAlertMessage('error', `Error al eliminar: ${err.message}`);
        },
      });
    }
  }

// Método para cancelar la eliminación
cancelDelete(): void {
  this.showDeleteModal = false; // Solo cierra el modal
}


  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page
      this.updatePagination()
    }
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--
      this.updatePagination()
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++
      this.updatePagination()
    }
  }

  //----------------------------------------------------------------------------------------
  //Controlar alertas de errores
  
  

  //Arriba alertas.-------------------------------------------------------------------------



}