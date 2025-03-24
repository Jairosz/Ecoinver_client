import { Component, type OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { finalize } from "rxjs/operators"
import  { UsersService, Usuario } from "../../services/Users.service"
import { UpdateUserDTO } from '../../types/UpdateUserDto';
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
  rols: string[]=[]

  filteredData: Usuario[] = []
  paginatedData: Usuario[] = []
  selectedUsuario: Usuario | null = null
  numId: number=0;

  upData : UpdateUserDTO[]=[]
  

  // Propiedades para el modal
  newUser: UpdateUserDTO = {
    nombreCompleto: "",
    username: "",
    password: "",
    role: "",
    email: ""
  }
  editMode = false
  showModal = false

  constructor(private UsersService: UsersService) {}

  get totalPages(): number {
    return Math.ceil(this.filteredData.length / this.itemsPerPage)
  }

  ngOnInit(): void {
    this.loadUsers()
    this.loadRoles()
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
    this.UsersService.getRolesUsuarios().subscribe({
      next: (roles: string[]) => {
        this.roles = roles // Aquí almacenamos los roles de los usuarios
      },
      error: (err) => {
        console.error("Error al cargar los roles:", err)
      },
    })
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
      username: "",
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

  saveUser(): void {
    if (this.editMode) {
      // Actualizar usuario existente
      this.UsersService.updateUsuario(this.newUser, this.numId).subscribe({
        next: (updatedUsuario) => {
          const index = this.data.findIndex((u) => u.id === updatedUsuario.id)
          if (index !== -1) {
            this.data[index] = updatedUsuario
            this.filterData()
          }
          this.closeModal()
          alert("Usuario actualizado exitosamente")
        },
        error: (err) => {
          console.error("Error al actualizar usuario:", err)
          alert("Error al actualizar el usuario")
        },
      })
    } else {
      // Crear nuevo usuario
      this.UsersService.createUsuario(this.newUser).subscribe({
        next: (newUser) => {
          this.upData.push(newUser)
          this.filterData()
          this.closeModal()
          alert("Usuario creado exitosamente")
        },
        error: (err) => {
          console.error("Error al crear usuario:", err)
          alert("Error al crear el usuario")
        },
      })
    }
  }

  closeModal(): void {
    this.showModal = false
    this.newUser = {
      nombreCompleto: "",
      username: "",
      password: "",
      role: "",
      email: "",
      //showPassword: false,
    }
    this.editMode = false
  }

  delete(): void {
    if (this.selectedUsuario && this.selectedUsuario.id) {
      if (!confirm("¿Está seguro de eliminar este usuario?")) return

      this.UsersService.deleteUsuario(this.selectedUsuario.id).subscribe({
        next: () => {
          this.data = this.data.filter((u) => u.id !== this.selectedUsuario?.id)
          this.filterData()
          this.selectedUsuario = null
        },
        error: (err) => {
          console.error("Error al eliminar usuario:", err)
          alert("Error al eliminar el usuario")
        },
      })
    }
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
}