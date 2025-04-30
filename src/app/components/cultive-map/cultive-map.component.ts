import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GenderService } from '../../services/Gender.service';
import { CultivoService } from '../../services/Cultivo.service';
import { Cultive } from '../../types/Cultive';

interface GenreItem {
  id: number;
  nombre: string;
}

interface FamilyItem {
  familia: string;
  nombreGenero: GenreItem[];
}

@Component({
  selector: 'app-cultive-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cultive-map.component.html',
  styleUrls: ['./cultive-map.component.css']
})
export class CultiveMapComponent implements OnInit {
  texto = '';
  familiaSeleccionada = 'todas';

  genders: { idGenero: number; nombreFamilia: string; nombreGenero: string }[] = [];
  family: FamilyItem[] = [];

  cultivos: Cultive[] = [];
  superficieTotal: number = 0;

  constructor(
    private generoServicio: GenderService,
    private cultivoService: CultivoService
  ) { }

  ngOnInit() {
    this.generoServicio.get().subscribe(data => {
      this.genders = data;
      this.buildFamilyList();
    });

    this.cultivoService.getAll().subscribe(data => {
      this.cultivos = data;
    });
  }

  private buildFamilyList() {
    this.family = [];
    for (const g of this.genders) {
      const genre: GenreItem = { id: g.idGenero, nombre: g.nombreGenero };
      const existing = this.family.find(f => f.familia === g.nombreFamilia);
      if (existing) {
        if (!existing.nombreGenero.some(x => x.id === genre.id)) {
          existing.nombreGenero.push(genre);
        }
      } else {
        this.family.push({
          familia: g.nombreFamilia,
          nombreGenero: [genre]
        });
      }
    }
  }

  get busquedaFamilia(): FamilyItem[] {
    const term = this.texto.toLowerCase().trim();
    const famSel = this.familiaSeleccionada.toLowerCase();

    return this.family.filter(f => {
      const matchFam = famSel === 'todas'
        || f.familia.toLowerCase().includes(famSel);
      if (!matchFam) return false;

      if (term) {
        return (
          f.familia.toLowerCase().includes(term) ||
          f.nombreGenero.some(n => n.nombre.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }

  onGeneroSelect(idGenero: number) {
    console.log('ID género seleccionado:', idGenero);

    const cultivosFiltrados = this.cultivos.filter(c => c.idGenero === idGenero);

    this.superficieTotal = cultivosFiltrados.reduce((acc, c) => acc + (c.superficie || 0), 0);
    console.log('Superficie total del género seleccionado:', this.superficieTotal);

    console.log('Detalle de superficie por cultivo:');
    cultivosFiltrados.forEach((c, i) => {
      console.log(`Cultivo ${i + 1}: ID = ${c.id}, Superficie = ${c.superficie}`);
    });
  }


}
