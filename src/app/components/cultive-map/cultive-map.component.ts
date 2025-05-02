import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// Usamos el standalone directive en lugar de NgxEchartsModule.forRoot()
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
// Importamos ECharts core + sólo los charts/componentes necesarios
import * as echarts from 'echarts/core';
import { PieChart, TreemapChart } from 'echarts/charts';
import { TooltipComponent, TitleComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

import type { EChartsOption } from 'echarts';

// Póntelo en marcha: registramos sólo lo que necesitamos
echarts.use([
  PieChart,
  TreemapChart,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
  CanvasRenderer
]);

import { GenderService } from '../../services/Gender.service';
import { CultivoService } from '../../services/Cultivo.service';
import { Cultive } from '../../types/Cultive';

interface GenreItem { id: number; nombre: string; }
interface FamilyItem { familia: string; nombreGenero: GenreItem[]; }

@Component({
  selector: 'app-cultive-map',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgxEchartsDirective    // <-- la directiva standalone
  ],
  providers: [
    // Proveedor para NGX_ECHARTS_CONFIG
    provideEchartsCore({ echarts })
  ],
  templateUrl: './cultive-map.component.html',
  styleUrls: ['./cultive-map.component.css']
})
export class CultiveMapComponent implements OnInit {
  texto = '';
  familiaSeleccionada = 'todas';

  genders: { idGenero: number; nombreFamilia: string; nombreGenero: string }[] = [];
  family: FamilyItem[] = [];

  cultivos: Cultive[] = [];
  superficieTotal = 0;

  view: 'pie' | 'tree' = 'pie';
  optionsPie: EChartsOption = {};
  optionsTree: EChartsOption = {};

  constructor(
    private generoServicio: GenderService,
    private cultivoService: CultivoService
  ) {}

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
      const matchFam = famSel === 'todas' || f.familia.toLowerCase().includes(famSel);
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
    const cultivosFiltrados = this.cultivos.filter(c => c.idGenero === idGenero);
    this.superficieTotal = cultivosFiltrados.reduce((sum, c) => sum + (c.superficie || 0), 0);

    const serie = cultivosFiltrados.map((c, i) => ({
      name: c.nombreVariedad || `Cultivo ${i + 1}`,
      value: c.superficie
    }));

    this.optionsPie = {
      title: {
        text: `Superficie total: ${this.superficieTotal}`,
        left: 'center', top: 10,
        textStyle: { fontSize: 14 }
      },
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      series: [{
        name: 'Cultivos',
        type: 'pie',
        radius: ['40%', '70%'],
        label: { formatter: '{b} ({d}%)' },
        data: serie
      }]
    };

    this.optionsTree = {
      title: {
        text: `Superficie total: ${this.superficieTotal}`,
        left: 'center', top: 10,
        textStyle: { fontSize: 14 }
      },
      tooltip: { formatter: '{b}: {c} ({d}%)' },
      series: [{
        name: 'Cultivos',
        type: 'treemap',
        roam: false,
        nodeClick: false,
        label: { show: true, formatter: '{b} ({d}%)' },
        data: serie
      }]
    };
  }
}
