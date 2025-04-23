import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GenderService } from '../../services/Gender.service';

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

  // El servicio debe devolver algo como { idGenero: number, nombreFamilia: string, nombreGenero: string }
  genders: { idGenero: number; nombreFamilia: string; nombreGenero: string }[] = [];

  // Ahora cada nombre de género es un objeto con id y nombre
  family: FamilyItem[] = [];

  constructor(private generoServicio: GenderService) {}

  ngOnInit() {
    this.generoServicio.get().subscribe(data => {
      this.genders = data;
      this.buildFamilyList();
    });
  }

  private buildFamilyList() {
    this.family = [];
    for (const g of this.genders) {
      const genre: GenreItem = { id: g.idGenero, nombre: g.nombreGenero };
      const existing = this.family.find(f => f.familia === g.nombreFamilia);
      if (existing) {
        // Evitamos duplicados por id
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

  onGeneroSelect(id: number) {
    console.log('ID género seleccionado:', id);
  }
}
