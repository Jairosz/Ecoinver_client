import { ChangeDetectorRef, Component } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Comercial, ComercialServiceService } from '../../services/Comercial.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { CommonModule } from '@angular/common';
import { ComercialPlanningService } from '../../services/ComercialPlanning.service';
import { ComercialPlanning } from '../../types/ComercialPlanning';
import { ComercialPlanningDetailsService } from '../../services/ComercialPlanningDetails.service';
import { ComercialPlanningDetails } from '../../types/ComercialPlanningDetails';
import { ComercialPlanningPost } from '../../types/ComercialPlanningPost';
import { ComercialPlanningDetailsWithId } from '../../types/ComercialPlanningDetailsWithId';



@Component({
  selector: 'app-comercial-planning',
  imports: [FormsModule, NgSelectModule, CommonModule, ReactiveFormsModule],
  templateUrl: './comercial-planning.component.html',
  styleUrl: './comercial-planning.component.css'
})
export class ComercialPlanningComponent {
  modal = false;
  editarBoton: boolean = false;

  validar: string | null = null//Para el botón guardar planificación
  semanas: { semana: number, fecha: string }[] = [];//Array que contendrá la semana y fecha de los cards
  rangoSemana: { inicio: Date, fin: Date }[] = [];
  comercial: Comercial[] = [];
  planning: ComercialPlanning[] = [];
  plannigDetails: ComercialPlanningDetailsWithId[] = [];//Array donde se guardans los cards en la BD
  planningEditar: ComercialPlanningDetailsWithId[] = [];//Para editar los planning
  guardarPlanning: ComercialPlanningDetails = {
    idCommercialNeedsPlanning: 0,
    kilos: 0,
    fechaDesde: new Date(),
    fechaHasta: new Date(),
    numeroSemana: 0,
  }
  distribuido: number = 0;
  pendiente: number = 0;
  selectedComercial: Comercial = {
    id: 0,
    clientCode: 0,
    clientName: '',
    startDate: new Date(),
    endDate: new Date(),
    idGenero: 0,
    nombreGenero: '',
    kgs: 0
  };
  editarPlanning: boolean = false;
  formulario: FormGroup;
  validForm: boolean = false;//Para validar el formualarrio
  index: number = -1;

  constructor(private comercialServicio: ComercialServiceService, private comercialPlanning: ComercialPlanningService, private comercialDetails: ComercialPlanningDetailsService, private fb: FormBuilder, private cdr: ChangeDetectorRef) {
    this.formulario = this.fb.group({
      semanas: this.fb.array([]) // Inicializa un FormArray vacío
    });
  }
  ngOnInit(): void {


    this.comercialServicio.getComercial().subscribe(//Obtenemos las necesidades comerciales guardadas en la base de datos
      (data) => {
        this.comercial = data;
      },
      (error) => {
        console.log(error);
      }

    );
    //Obtenemos los datos del planning de la BD
    this.comercialPlanning.get().subscribe(
      (data) => {
        this.planning = data;

      },
      (error) => {
        console.log(error);
      }

    );

  }
  ngAfterViewInit() {
    this.cdr.detectChanges();
  }

  calcularSemanas(evento: Comercial) {//Calculo del rengo de las fechas para generar los Cards

    this.semanas = [];
    this.rangoSemana = [];
    this.distribuido = 0;
    this.pendiente = 0;
    this.planningEditar = [];
    this.validar = null;
    this.editarBoton = false;

    if (evento) {
      //Obtenemos los datos detalles de cada card del planning de la BD
      this.comercialDetails.get().subscribe(
        (data) => {
          this.plannigDetails = data;
          this.selectedComercial = {//El comercial seleccionado en el ngSelect.
            id: evento.id,
            clientCode: evento.clientCode,
            clientName: evento.clientName,
            startDate: evento.startDate,
            endDate: evento.endDate,
            idGenero: evento.idGenero,
            nombreGenero: evento.nombreGenero,
            kgs: evento.kgs
          };



          const startDate = new Date(evento.startDate);
          const endDate = new Date(evento.endDate);
          let inicio = new Date(startDate);
          let fin;
          let numSemanas = 0;
          //Calculo del número de semana
          const primerDia = new Date(inicio.getFullYear(), 0, 1); // 1 de enero
          const diaSemana = primerDia.getDay(); // 0 = domingo, 1 = lunes, ...

          // Ajustamos el inicio para que la semana comience correctamente
          const diasDesdePrimerDia = Math.floor((inicio.getTime() - primerDia.getTime()) / (1000 * 60 * 60 * 24));
          const diasAjustados = diasDesdePrimerDia + diaSemana; // Ajuste si semana inicia en domingo

          let semana = [];
          semana.push(Math.floor(diasAjustados / 7) + 1);

          for (let i = new Date(startDate); i <= endDate; i.setDate(i.getDate() + 1)) {//Se recorren las fechas
            if (inicio.getFullYear() !== i.getFullYear()) {
              semana.push(1);
            }
            if (i.getDay() == 0) {//Si el dia de la fecha es igual a domingo
              fin = new Date(i.getFullYear(), i.getMonth(), i.getDate());
              numSemanas++;//Sumamos una semana
              this.semanas.push({
                semana: semana[semana.length - 1], fecha: inicio.toLocaleDateString('es-ES', {
                  day: '2-digit',   // Asegura que el día tenga 2 dígitos
                  month: '2-digit', // Asegura que el mes tenga 2 dígitos
                  year: 'numeric',
                }) + '-' + fin.toLocaleString('es-ES', {
                  day: '2-digit',   // Asegura que el día tenga 2 dígitos
                  month: '2-digit', // Asegura que el mes tenga 2 dígitos
                  year: 'numeric',
                })
              });

              this.rangoSemana.push({
                inicio: new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate(), 12, 0, 0),
                fin: new Date(fin.getFullYear(), fin.getMonth(), fin.getDate(), 12, 0, 0)
              });
              inicio = new Date(i.getFullYear(), i.getMonth(), i.getDate() + 1);


              semana.push(semana[semana.length - 1] + 1);
            }
            if (i.getTime() === endDate.getTime()) {
              fin = new Date(i.getFullYear(), i.getMonth(), i.getDate());

              if (i.getDay() != 0) {//Si hemos entrado en una nueva semana aunque no sea domingo.

                this.semanas.push({
                  semana: semana[semana.length - 1], fecha: inicio.toLocaleDateString('es-ES', {
                    day: '2-digit',   // Asegura que el día tenga 2 dígitos
                    month: '2-digit', // Asegura que el mes tenga 2 dígitos
                    year: 'numeric',
                  }) + '-' + fin.toLocaleString('es-ES', {
                    day: '2-digit',   // Asegura que el día tenga 2 dígitos
                    month: '2-digit', // Asegura que el mes tenga 2 dígitos
                    year: 'numeric',
                  })
                });
                this.rangoSemana.push({
                  inicio: new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate(), 12, 0, 0),
                  fin: new Date(fin.getFullYear(), fin.getMonth(), fin.getDate(), 12, 0, 0)
                });

                numSemanas++;//Sumamos una semana
                semana.push(semana[semana.length - 1] + 1)
              }

            }

          }



          console.log(this.rangoSemana);

          const planning: ComercialPlanningPost = {

            idCommercialNeed: this.selectedComercial.id,
            weekNumber: numSemanas,
            kgs: this.selectedComercial.kgs,
            startDate: this.selectedComercial.startDate,
            endDate: this.selectedComercial.endDate
          }
          //Guardamos en la tabla planning la necesidad comercial.

          if (planning && !this.planning.find(item => item.idCommercialNeed == planning.idCommercialNeed)) {//Para que no se repita la misma necesidad comercial en la tabla
            console.log(this.planning);
            console.log(planning.idCommercialNeed);
            this.comercialPlanning.post(planning).subscribe(
              (data) => {
                console.log('Se han insertado los datos correctamente');
                this.planning.push(data.entity);


              },
              (error) => {
                console.log(error);
              }

            );
          }
          if (this.planning.find(item => item.idCommercialNeed == evento.id)) {
            const edit = this.planning.find(item => item.idCommercialNeed == evento.id);
            let j = 0;
            this.plannigDetails = this.plannigDetails.sort((a, b) => {
              return new Date(a.fechaDesde).getTime() - new Date(b.fechaDesde).getTime();
            });
            for (let i = 0; i < this.plannigDetails.length; i++) {
              if (this.plannigDetails[i].idCommercialNeedsPlanning == edit?.id) {//Si encuentra el comercial ya planificado se guardan los valores
                const fecha = new Date(this.plannigDetails[i].fechaDesde);
                fecha.setHours(12, 0, 0, 0); // Evitar errores de zona horaria

                const primerDia = new Date(fecha.getFullYear(), 0, 1); // 1 de enero del mismo año
                const diff = (fecha.getTime() - primerDia.getTime()) / (1000 * 60 * 60 * 24); // Diferencia en días
                const ajuste = primerDia.getDay(); // Día de la semana del 1 de enero (0=domingo, 1=lunes, etc.)

                let sem = Math.floor((diff + ajuste) / 7)+1; // Semana del año
                
                
                if (sem === semana[j]) {
                 
                  this.planningEditar.push({
                    id: this.plannigDetails[i].id,
                    idCommercialNeedsPlanning: this.plannigDetails[i].idCommercialNeedsPlanning,
                    numeroSemana: this.plannigDetails[i].numeroSemana,
                    kilos: this.plannigDetails[i].kilos,
                    fechaDesde: this.plannigDetails[i].fechaDesde,
                    fechaHasta: this.plannigDetails[i].fechaHasta
                  });

                  if (this.plannigDetails[i]) {
                    this.distribuido += this.plannigDetails[i]!.kilos ?? 0;
                  }
                }
                else {
                 
                  this.planningEditar.push({
                    id: undefined,
                    idCommercialNeedsPlanning: this.plannigDetails[i].idCommercialNeedsPlanning,
                    numeroSemana: semana[j],
                    kilos: 0,
                    fechaDesde: this.plannigDetails[i].fechaDesde,
                    fechaHasta: this.plannigDetails[i].fechaHasta
                  });
                  i--;
                }

                j++;
                if (semana[j] == undefined) {
                  break;
                }

              }
            }


          }
          this.semanasFormArray.clear();
          console.log(this.planningEditar);
          this.semanas.forEach((semana, index) => {
            // Crear un FormControl deshabilitado por defecto
            const control = this.fb.control(
              this.planningEditar[index]?.kilos || '',
              [Validators.required, Validators.min(1)]
            );

            this.semanasFormArray.push(control);
          });
          console.log(this.planningEditar)
          this.semanasFormArray.controls.forEach(control => {
            if (control.value !== '') {
              control.disable();

            }
            else {
              control.enable();
            }


          });
          console.log(this.planningEditar);
          this.pendiente = evento.kgs - this.distribuido;

        },
        (error) => {
          console.log('Error ' + error);
        }

      );

    }

  }

  resumen() {
    this.distribuido = 0;

    const input = document.querySelectorAll('input[type="number"]') as NodeListOf<HTMLInputElement>;
    for (let i = 0; i < input.length; i++) {
      this.distribuido += Number(input[i].value);
      if (this.planningEditar[i]) {
        this.planningEditar[i].kilos = Number(input[i].value);
      }

    }
    console.log(input.toString());
    this.pendiente = this.selectedComercial.kgs - this.distribuido;
  }

  search(nombre: string, comercial: Comercial) {//Búsqueda en el ng select
    nombre = nombre.toLowerCase().trim();

    return comercial.clientCode.toString().toLowerCase().includes(nombre) || comercial.clientName.toLowerCase().includes(nombre);

  }
  //Aquí se guardan los datos de los cards en la tabla commercialneedsplanningdetails
  async guardar() {
    this.validar = null;


    const id = this.planning.find(item => item.idCommercialNeed == this.selectedComercial.id);


    if (id === undefined || this.plannigDetails.find(item => item.idCommercialNeedsPlanning == id?.id)) {

      this.validar = 'Esta necesidad comercial ya existe en el sistema';
      this.modal = false;
      setTimeout(() => {
        this.validar = null;
        return;
      }, 2000);


    }
    else {
      for (let i = 0; i < this.semanasFormArray.length; i++) {
        if (this.semanasFormArray.controls[i].invalid) {

          this.validForm = true;

        }
      }
      if (this.validForm) {

        this.validForm = true;
        console.log('Error');
        setTimeout(() => {
          this.validForm = false;
          return;
        }, 2000)
      }
      else {
        const input = document.querySelectorAll('input[type="number"]') as NodeListOf<HTMLInputElement>;
        const promesas = [];
        for (let i = 0; i < input.length; i++) {
          this.guardarPlanning = {
            idCommercialNeedsPlanning: id?.id || 0,
            kilos: Number(input[i].value),
            fechaDesde: this.rangoSemana[i].inicio,
            fechaHasta: this.rangoSemana[i].fin,
            numeroSemana: this.semanas[i].semana

          };
          console.log(this.guardarPlanning);
          const promesa = this.comercialDetails.post(this.guardarPlanning).toPromise();
          promesas.push(promesa);
        }

        try {
          const resultado = await Promise.all(promesas);

          this.modal = true;
          console.log('Datos insertados correctamente ' + resultado);

        } catch (error) {
          console.log('Error al guardar los datos ' + error);
          this.modal = false;
        }



      }
    }

  }
  cerrarModal() {

    this.modal = false;
    window.location.reload();

  }
  //Barra de progreso

  get calcularPorcentaje() {
    const porcentaje = (this.distribuido * 100) / this.selectedComercial.kgs;
    if (porcentaje <= 100) {
      return porcentaje;
    } else {
      return 100;
    }

  }

  editar(indice: number) {//Para editar cada Card.

    const editar = this.planningEditar[indice];

    for (let i = 0; i < this.semanasFormArray.length; i++) {

      if (this.semanasFormArray.controls[i].invalid && i === indice) {

        this.validForm = true;
        setTimeout(() => {
          this.validForm = false;
        }, 2000)
        return;
      }
    }
    if (editar) {
      if (editar.id) {

        this.comercialDetails.put(editar.id, editar).subscribe(
          (data) => {
            console.log(data);

            this.editarPlanning = true;
            this.validar = null;
            this.editarBoton = false;
            this.semanasFormArray.controls[indice].disable();
          },
          (error) => {
            console.log('Error al editar' + error);
          }
        );
      }
      else {
        const id = this.planning.find(item => item.idCommercialNeed == this.selectedComercial.id);

        const input = document.querySelectorAll('input[type="number"]') as NodeListOf<HTMLInputElement>;

        if (this.semanasFormArray.controls[indice].invalid) {
          this.validForm = true;
          setTimeout(() => {
            this.validForm = false;
          }, 2000);
          return;
        }
        const fecha = new Date(this.rangoSemana[indice].inicio);
        fecha.setHours(12, 0, 0, 0); // evitar problemas por zona horaria

        const primerDia = new Date(fecha.getFullYear(), 0, 1);
        const diff = (fecha.getTime() - primerDia.getTime()) / (1000 * 60 * 60 * 24);
        const ajuste = primerDia.getDay(); // 0 = domingo, 1 = lunes, etc.
        console.log(this.rangoSemana);
        ;
        const semana = Math.floor((diff + ajuste) / 7) + 1;

        this.guardarPlanning = {
          idCommercialNeedsPlanning: id?.id || 0,
          kilos: Number(input[indice].value),
          fechaDesde: this.rangoSemana[indice].inicio,
          fechaHasta: this.rangoSemana[indice].fin,
          numeroSemana: semana
        };
        console.log(this.rangoSemana);


        this.comercialDetails.post(this.guardarPlanning).subscribe(
          (data) => {
            console.log(data);
            this.editarPlanning = true;
            this.validar = null;
            this.editarBoton = false;
            this.semanasFormArray.controls[indice].disable();
          },
          (error) => {
            console.log(error);
          }


        )
      }
    }

    else {
     
      const id = this.planning.find(item => item.idCommercialNeed == this.selectedComercial.id);

      const input = document.querySelectorAll('input[type="number"]') as NodeListOf<HTMLInputElement>;

      if (this.semanasFormArray.controls[indice].invalid) {
        this.validForm = true;
        setTimeout(() => {
          this.validForm = false;
        }, 2000);
        return;
      }
      const fecha = new Date(this.rangoSemana[indice].inicio);
      fecha.setHours(12, 0, 0, 0); // evitar problemas por zona horaria

      const primerDia = new Date(fecha.getFullYear(), 0, 1);
      const diff = (fecha.getTime() - primerDia.getTime()) / (1000 * 60 * 60 * 24);
      const ajuste = primerDia.getDay(); // 0 = domingo, 1 = lunes, etc.

      const semana = Math.floor((diff + ajuste) / 7) + 1;
      this.guardarPlanning = {
        idCommercialNeedsPlanning: id?.id || 0,
        kilos: Number(input[indice].value),
        fechaDesde: this.rangoSemana[indice].inicio,
        fechaHasta: this.rangoSemana[indice].fin,
        numeroSemana: semana
      };
      console.log(this.rangoSemana);


      this.comercialDetails.post(this.guardarPlanning).subscribe(
        (data) => {
          console.log(data);
          this.editarPlanning = true;
          this.validar = null;
          this.editarBoton = false;
          this.semanasFormArray.controls[indice].disable();
        },
        (error) => {
          console.log(error);
        }


      )

    }
    console.log(this.planningEditar);

  }

  modalEditar() {
    this.editarPlanning = false;
  }

  habilitarBoton(i: number) {
    if (this.editarBoton == false) {
      this.editarBoton = true;
      this.semanasFormArray.controls[i].enable();
      this.index = i;
    } else {
      this.editarBoton = false;

      this.semanasFormArray.controls[i].disable();
    }
    this.cdr.detectChanges(); // Forzar la detección de cambios
  }
  get semanasFormArray(): FormArray<FormControl> {
    return this.formulario.get('semanas') as FormArray<FormControl>;
  }

}
