import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { PieChart, TreemapChart } from 'echarts/charts';
import { TooltipComponent, TitleComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

import type { EChartsOption } from 'echarts';

import { GenderService } from '../../services/Gender.service';
import { CultivoService } from '../../services/Cultivo.service';
import { Cultive } from '../../types/Cultive';

interface GenreItem { id: number; nombre: string; }
interface FamilyItem { familia: string; nombreGenero: GenreItem[]; }

echarts.use([
  PieChart,
  TreemapChart,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
  CanvasRenderer
]);

@Component({
  selector: 'app-cultive-map',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgxEchartsDirective
  ],
  providers: [
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

  // --- NUEVOS ESTADOS ---
  selectedGeneroId: number | null = null;
  groupBy: 'variedad' | 'agricultor' = 'variedad';

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
    this.selectedGeneroId = idGenero;
    this.updateChart();
  }

  // Construye y refresca optionsPie y optionsTree según selectedGeneroId y groupBy
  updateChart() {
    if (this.selectedGeneroId == null) {
      return;
    }

    // 1. Filtrar cultivos por género
    const cultivosFiltrados = this.cultivos.filter(c => c.idGenero === this.selectedGeneroId);

    // 2. Calcular superficie total
    this.superficieTotal = cultivosFiltrados.reduce((sum, c) => sum + (c.superficie || 0), 0);
    const total = this.superficieTotal;

    // 3. Agrupar por variedad o agricultor
    interface Agg { value: number; agricultores: string[] }
    const agrupados: Record<string, Agg> = {};

    for (const c of cultivosFiltrados) {
      const key = this.groupBy === 'variedad'
        ? (c.nombreVariedad || 'Sin variedad')
        : (c.nombreAgricultor || 'Sin agricultor');

      if (!agrupados[key]) {
        agrupados[key] = { value: 0, agricultores: [] };
      }
      agrupados[key].value += (c.superficie || 0);
      if (this.groupBy === 'variedad') {
        agrupados[key].agricultores.push(c.nombreAgricultor);
      }
    }

    // 4. Construir la serie ECharts
    const serie = Object.entries(agrupados).map(([name, { value, agricultores }]) => ({
      name,
      value,
      agricultores
    }));

    // 5. Options para Pie
    this.optionsPie = {
      title: {
        text: `Superficie total: ${total} m²`,
        left: 'center',
        top: 10,
        padding: [0, 0, 20, 0],
        textStyle: { fontSize: 14, color: '#fff' }
      },
      graphic: [{
        type: 'line',
        left: 'center',
        top: 40,
        shape: { x1: -150, y1: 0, x2: 150, y2: 0 },
        style: { stroke: '#fff', lineWidth: 1 }
      }],
      tooltip: {
        trigger: 'item',
        formatter: (p: any) => {
          const val = p.value as number;
          const pct = p.percent;
          let extra = '';
          if (this.groupBy === 'variedad') {
            const unique = Array.from(new Set(p.data.agricultores)).join(', ');
            extra = `<br/>Agricultor(es): ${unique}`;
          }
          return `${p.name}: ${val} m² (${pct}%)${extra}`;
        }
      },
      series: [{
        name: 'Cultivos',
        type: 'pie',
        radius: ['40%', '70%'],
        label: { formatter: '{b}: {c} m² ({d}%)' },
        data: serie
      }]
    };

    // 6. Options para Treemap
    this.optionsTree = {
      title: {
        text: `Superficie total: ${total} m²`,
        left: 'center',
        top: 10,
        padding: [0, 0, 20, 0],
        textStyle: { fontSize: 15, color: '#fff' }
      },
      graphic: [{
        type: 'line',
        left: 'center',
        top: 45,
        shape: { x1: -150, y1: 0, x2: 150, y2: 0 },
        style: { stroke: '#fff', lineWidth: 1 }
      }],
      tooltip: {
        formatter: (p: any) => {
          const val = p.value as number;
          const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
          let extra = '';
          if (this.groupBy === 'variedad') {
            const unique = Array.from(new Set(p.data.agricultores)).join(', ');
            extra = `<br/>Agricultor(es): ${unique}`;
          }
          return `${p.name}: ${val} m² (${pct}%)${extra}`;
        }
      },
      series: [{
        name: 'Cultivos',
        type: 'treemap',
        roam: false,
        nodeClick: false,
        label: { show: true, formatter: '{b}: {c} m²' },
        data: serie
      }]
    };
  }
}
