import { Component, OnInit } from '@angular/core';
import { RoleResponse } from '../../types/RoleResponse';
import { RoleService, Rol } from '../../services/Role.service';
import { finalize } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/Auth.service';
import { HostListener } from '@angular/core';

@Component({
  selector: 'app-roles',
  imports: [CommonModule, FormsModule],
  templateUrl: './roles.component.html',
  styleUrl: './roles.component.css'
})
export class RolesComponent implements OnInit {
  Math = Math;
  loading = true;
  errorMessage = '';

  
  data: Rol[] = [];
  searchQuery = '';
  itemsPerPage = 5;
  currentPage = 1;
  filteredData: Rol[] = [];
  paginatedData: Rol[] = [];
  selectedRol: Rol | null = null;
  numId: string = '';

  // Variables para alertas
  showAlert: boolean = false;
  alertMessage: string = '';
  alertType: 'success' | 'error' | 'warning' = 'success';
  private alertTimer: any;

  // Propiedades para el modal
  newRol: RoleResponse = {
    id: '',
    name: '',
    description: '',
    level: 0,
  };

  editMode = false;
  showModal = false;
  showDeleteModal = false;
  currentUser: { id: string; role: string } | null = null;
  currentUserLevel: number = 99; // Valor por defecto alto

  constructor(
    private roleService: RoleService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    console.log("Current user from auth service:", this.currentUser);
    this.loadRoles();
  }

  private loadRoles(): void {
    this.roleService.getRoles()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (data: Rol[]) => {
          this.data = data;
          this.filterData();
          this.setCurrentUserLevel(); // Actualizar nivel después de cargar datos
        },
        error: (err) => {
          console.error('Error al cargar roles:', err);
          this.errorMessage = 'Error al cargar los roles. Por favor, intente de nuevo más tarde.';
        },
      });
  }

  private setCurrentUserLevel(): void {
  if (this.currentUser && this.currentUser.role) {
    // Make sure we're comparing the same format of strings
    const userRoleName = this.currentUser.role.toLowerCase().trim();
    
    // Find the role by name (case-insensitive comparison)
    const userRole = this.data.find(r => 
      r.name.toLowerCase().trim() === userRoleName
    );
    
    if (userRole && userRole.level !== undefined) {
      this.currentUserLevel = userRole.level;
    } else {
      console.warn('Role level not found for:', this.currentUser.role);
      this.currentUserLevel = 99; // Default if not found
    }
    
    console.log('Current user details:', {
      role: this.currentUser.role,
      foundRole: userRole,
      level: this.currentUserLevel
    });
  }
}

  // Métodos de paginación
  get totalPages(): number {
    return Math.ceil(this.filteredData.length / this.itemsPerPage);
  }

  updatePagination(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedData = this.filteredData.slice(startIndex, endIndex);
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

  // Filtrado de datos
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
    this.selectedRol = null;
    this.updatePagination();
  }

  // Métodos para el modal
  openCreateModal(): void {
    this.editMode = false;
    this.newRol = { id: '', name: '', description: '', level: 0 };
    this.showModal = true;
  }

  edit(): void {
    if (this.selectedRol && this.canManageRole(this.selectedRol)) {
      this.editMode = true;
      this.newRol = { ...this.selectedRol };
      this.showModal = true;
    }
  }

  saveRole(): void {
    if (this.newRol.level <= this.currentUserLevel) {
      this.showAlertMessage('error', 'No puedes gestionar roles con nivel igual o mayor al tuyo');
      return;
    }
    if (this.editMode) {
      this.roleService.updateRole(this.newRol.id, this.newRol).subscribe({
        next: (updatedRole) => {
          this.data = this.data.map(role => 
            role.id === updatedRole.id ? updatedRole : role
          );
          this.filterData();
          this.showAlertMessage('success', 'Rol actualizado exitosamente', 3000);
          this.closeModal();
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        },
        error: (err) => {
          this.showAlertMessage('error', `Error al actualizar: ${err.message}`);
        },
      });
    } else {
      this.roleService.createRole(this.newRol).subscribe({
        next: (newRole) => {
          this.data = [...this.data, newRole];
          this.filterData();
          this.closeModal();
          this.showAlertMessage('success', 'Rol creado exitosamente', 3000);
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        },
        error: (err) => {
          this.showAlertMessage('error', `Error al crear: ${err.message}`);
        },
      });
    }
  }

  delete() {
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (this.selectedRol?.id && this.canManageRole(this.selectedRol)) {
      this.roleService.deleteRole(this.selectedRol.id).subscribe({
        next: () => {
          this.data = this.data.filter((u) => u.id !== this.selectedRol?.id);
          this.filterData();
          this.selectedRol = null;
          this.showDeleteModal = false;
          this.showAlertMessage('success', 'Rol eliminado exitosamente', 3000);
        },
        error: (err) => {
          this.showAlertMessage('error', `Error al eliminar: ${err.message}`);
        },
      });
    }
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
  }

  // Helpers
  selectRow(role: Rol): void {
    console.log("Selected role:", role);
  this.selectedRol = role;
  this.numId = this.selectedRol.id;
  console.log("Is selectedRol set?", this.selectedRol !== null);
  }

  canManageRole(targetRole: Rol): boolean {
    console.log("canManageRole check:", {
      targetRole,
      currentUser: this.currentUser,
      currentUserRole: this.data.find(r => r.name === this.currentUser?.role),
      currentUserLevel: this.currentUserLevel
    });
  
    if (!this.currentUser) return false;
    
    const currentRole = this.data.find(r => r.name === this.currentUser?.role);
    const canManage = currentRole ? currentRole.level < targetRole.level : false;
    
    console.log("Can manage result:", canManage);
    return this.currentUserLevel < targetRole.level;
  }

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

  closeModal(): void {
    this.showModal = false;
    this.newRol = { id: '', name: '', description: '', level: 0 };
    this.editMode = false;
  }



  //----------------------------------------------------------------------------------------
  //Control de clics
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Si hay un modal abierto, no hagas nada
    if (this.showModal || this.showDeleteModal) {
      return;
    }
  
    const target = event.target as HTMLElement;
    
    // Verifica si el clic fue en una fila de la tabla (tbody tr)
    const clickedRow = target.closest('tbody tr');
    // Verifica si el clic fue en un botón de acción (editar/borrar)
    const isActionButton = target.closest('.action-button');
  
    // Si no es una fila ni un botón de acción, deselecciona
    if (!clickedRow && !isActionButton) {
      this.selectedRol = null;
    }
  }


  //-------------------------------------------------------------------------
}