import { Component, type OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { UsersService, Usuario } from '../../services/Users.service';
import { UpdateUserDTO } from '../../types/UpdateUserDto';
import { RoleResponse } from '../../types/RoleResponse';
import { lastValueFrom } from 'rxjs';
import { AuthService } from '../../services/Auth.service';
//alertas

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
})
export class UsersComponent implements OnInit {
  Math = Math;
  loading = true;
  errorMessage = '';

  data: Usuario[] = [];
  listaRoles: string[] = []; // Aquí guardaremos los roles del desplegable
  searchQuery = '';
  itemsPerPage = 5;
  currentPage = 1;

  filteredData: Usuario[] = [];
  paginatedData: Usuario[] = [];
  selectedUsuario: Usuario | null = null;
  numId: string = '';

  upData: UpdateUserDTO[] = [];

  // Variables para alertas
  showAlert: boolean = false;
  alertMessage: string = '';
  alertType: 'success' | 'error' | 'warning' = 'success';
  private alertTimer: any;

  // Propiedades para el modal
  newUser: UpdateUserDTO = {
    nombreCompleto: '',
    userName: '',
    password: '',
    role: '',
    email: '',
  };
  editMode = false;
  showModal = false;

  showDeleteModal = false; // Para controlar la visibilidad del modal

  //verificar que role tiene el usuario
  // Cambiamos a guardar los roles con su nivel
  // users.component.ts
  roles: RoleResponse[] = []; // Inicializar con array vacío;
  roleLevelMap: { [key: string]: number } = {};
  currentUser: { id: string; role: string } | null = null;

  //nueva propiedad para filtrar roles
  filteredRoles: RoleResponse[] = [];


  currentUserLevel: number = 99;

  constructor(
    private UsersService: UsersService, //Users
    private authService: AuthService
  ) {}

  get totalPages(): number {
    return Math.ceil(this.filteredData.length / this.itemsPerPage);
  }

  ngOnInit(): void {
    this.loadRoles().then(() => {
      this.currentUser = this.authService.getCurrentUser();
      this.setCurrentUserLevel();
      this.loadListaRoles();
      this.loadUsers();
    });
  }

  
  private setCurrentUserLevel(): void {
    if (this.currentUser?.role) {
      this.currentUserLevel = this.roleLevelMap[this.currentUser.role.toLowerCase()] || 99;
    }
  }

  private loadUsers(): void {
    this.UsersService.getUsuarios()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data: Usuario[]) => {
          this.data = data.map((user) => ({
            ...user,
            showPassword: false,
          }));
          this.filterData();
        },
        error: (err) => {
          console.error('Error al cargar usuarios:', err);
          this.errorMessage =
            'Error al cargar los usuarios. Por favor, intente de nuevo más tarde.';
        },
      });
  }

  private async loadRoles(): Promise<void> {
    try {
      const roles$ = this.UsersService.getRoles();
      const roles = await lastValueFrom(roles$);

      this.roleLevelMap = roles.reduce((acc, role) => {
        acc[role.name.toLowerCase()] = role.level; // Normalizar clave a minúsculas
        return acc;
      }, {} as { [key: string]: number });

      console.log('Mapa de roles actualizado:', this.roleLevelMap);
    } catch (error) {
      console.error('Error cargando roles:', error);
      this.showAlertMessage('error', 'Error al cargar roles');
      this.roles = [];
    }
  }

  // En el loadListaRoles()
  private loadListaRoles(): void {
    this.UsersService.getRoles().subscribe({
      next: (listaRoles: RoleResponse[]) => {
        this.roles = listaRoles; // Guardar los objetos completos
      },
      error: (err) => {
        console.error('Error al cargar los roles:', err);
      },
    });
  }

  filterData(): void {
    const query = this.searchQuery.toLowerCase().trim();

    this.filteredData = query
      ? this.data.filter((item) =>
          Object.values(item).some((val) =>
            val?.toString().toLowerCase().includes(query)
          )
        )
      : [...this.data];

    this.currentPage = 1;
    this.selectedUsuario = null;
    this.updatePagination();
  }

  updatePagination(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedData = this.filteredData.slice(startIndex, endIndex);
  }

  selectRow(item: Usuario): void {
    this.selectedUsuario = item;
    this.numId = this.selectedUsuario.id;
  }

  togglePasswordVisibility(usuario: Usuario): void {
    usuario.showPassword = !usuario.showPassword;
  }

  // Métodos para el modal
  openCreateModal(): void {
    this.editMode = false;
    this.newUser = {
      nombreCompleto: '',
      userName: '',
      password: '',
      role: '',
      email: '',
    };
    this.showModal = true;
  }

  edit(): void {
    if (this.selectedUsuario && this.canManageUser(this.selectedUsuario)) {
      this.editMode = true;
      this.newUser = {
        ...this.selectedUsuario,
      };
      this.showModal = true;
    } else {
      this.showAlertMessage(
        'error',
        'No tienes permisos para editar este usuario'
      );
    }
  }

  //funciones para alertas
  private showAlertMessage(
    type: 'success' | 'error' | 'warning',
    message: string,
    duration: number = 5000
  ): void {
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
      this.showAlertMessage(
        'warning',
        'Por favor complete todos los campos requeridos'
      );
      return;
    }

    if (this.editMode) {
      this.UsersService.updateUsuario(this.newUser, this.numId).subscribe({
        next: (updatedUsuario) => {
          // Actualizar el usuario en la lista local
          const index = this.data.findIndex(u => u.id === updatedUsuario.id);
          if (index > -1) {
            this.data[index] = {
              ...this.data[index],
              ...updatedUsuario // Sobrescribir propiedades actualizadas
            };
          }
          
          this.filterData(); // Actualizar datos filtrados
          this.showAlertMessage('success', 'Usuario actualizado exitosamente', 3000);
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          this.closeModal();
        },
        error: (err) => {
          console.error("Error en actualización:", err);
          this.showAlertMessage('error', `Error al actualizar: ${err.message}`);
        },
      });
    } else {
      this.UsersService.createUsuario(this.newUser).subscribe({
        next: (newUser) => {
          this.upData.push(newUser);
          this.filterData();
          this.closeModal();
          //window.location.reload();
          this.showAlertMessage('success', 'Usuario creado exitosamente', 3000);
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          //window.location.reload();
        },
        error: (err) => {
          this.showAlertMessage('error', `Error al crear: ${err.message}`);
        },
      });
    }
  }

  private isFormValid(): boolean {
    return (
      !!this.newUser.nombreCompleto?.trim() &&
      !!this.newUser.userName.trim() &&
      !!this.newUser.email?.trim() &&
      !!this.newUser.role?.trim() &&
      (this.editMode || !!this.newUser.password?.trim())
    );
  }

  closeModal(): void {
    this.showModal = false;
    this.newUser = {
      nombreCompleto: '',
      userName: '',
      password: '',
      role: '',
      email: '',
      //showPassword: false,
    };
    this.editMode = false;
  }

  // Nueva función para obtener el nivel de un rol
  getLevelForRole(roleName: string): number {
    //console.log('Nivel del admin:', this.roleLevelMap['admin']);
    return this.roleLevelMap[roleName] || 99; // Valor alto por defecto si no encuentra el rol
  }

  // Método para verificar permisos de eliminación/edición
  // Función de permisos actualizada
  // users.component.ts
  canManageUser(targetUser: Usuario): boolean {
    if (!this.currentUser || !targetUser) return false;

    console.log(
      'Current user level:',
      this.currentUser.role,
      'Target user level:',
      targetUser.role
    );

    // Verificar auto-eliminación
    if (this.currentUser.id === targetUser.id) return false;

    // Obtener niveles
    const currentLevel = this.roleLevelMap[this.currentUser.role] || 99;
    const targetLevel = this.roleLevelMap[targetUser.role.toLowerCase()] || 99;

    return currentLevel < targetLevel;
  }

  delete() {
    console.log('Mostrando modal de eliminación');

    this.showDeleteModal = true;
  }

  // Método para confirmar la eliminación
  confirmDelete(): void {
    //control permisos
    if (!this.selectedUsuario || !this.canManageUser(this.selectedUsuario)) {
      this.showAlertMessage('error', 'No tienes permisos para esta acción');
      this.showDeleteModal = false;
      return;
    }
    if (this.selectedUsuario?.id) {
      this.UsersService.deleteUsuario(this.selectedUsuario.id).subscribe({
        next: () => {
          this.data = this.data.filter(
            (u) => u.id !== this.selectedUsuario?.id
          );
          this.filterData();
          this.selectedUsuario = null;
          this.showDeleteModal = false;
          this.showAlertMessage(
            'success',
            'Usuario eliminado exitosamente',
            3000
          );
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
      this.currentPage = page;
      this.updatePagination();
    }
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  //----------------------------------------------------------------------------------------
  //Controlar alertas de errores

  //Arriba alertas.-------------------------------------------------------------------------
}
