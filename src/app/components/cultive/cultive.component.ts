import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface LLMItem {
  modelName: string;
  developer: string;
  releaseDate: string;
  parameters: string;
  primaryApplication: string;
}

@Component({
  selector: 'app-cultive',
  // Si es un componente standalone, se declaran los módulos necesarios:
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cultive.component.html',
  styleUrls: ['./cultive.component.css']
})
export class CultiveComponent implements OnInit {
  // Propiedad para acceder a Math desde el template
  Math = Math;

  // Datos originales
  data: LLMItem[] = [
    { modelName: 'GPT-4', developer: 'OpenAI', releaseDate: 'March 2023', parameters: '1 trillion', primaryApplication: 'Natural Language Processing' },
    { modelName: 'BERT', developer: 'Google', releaseDate: 'October 2018', parameters: '340 million', primaryApplication: 'Natural Language Understanding' },
    { modelName: 'DALL-E 2', developer: 'OpenAI', releaseDate: 'April 2022', parameters: '3.5 billion', primaryApplication: 'Image Generation' },
    { modelName: 'T5', developer: 'Google', releaseDate: 'October 2019', parameters: '11 billion', primaryApplication: 'Text-to-Text Transfer' },
    { modelName: 'GPT-3.5', developer: 'OpenAI', releaseDate: 'November 2022', parameters: '175 billion', primaryApplication: 'Natural Language Processing' },
    { modelName: 'Codex', developer: 'OpenAI', releaseDate: 'August 2021', parameters: '12 billion', primaryApplication: 'Code Generation' },
    { modelName: 'PaLM 2', developer: 'Google', releaseDate: 'May 2023', parameters: '540 billion', primaryApplication: 'Multilingual Understanding' },
    { modelName: 'LaMDA', developer: 'Google', releaseDate: 'May 2021', parameters: '137 billion', primaryApplication: 'Conversational AI' },
    { modelName: 'CLIP', developer: 'OpenAI', releaseDate: 'January 2021', parameters: '400 million', primaryApplication: 'Image and Text Understanding' },
    { modelName: 'XLNet', developer: 'Google', releaseDate: 'June 2019', parameters: '340 million', primaryApplication: 'Natural Language Processing' },
    { modelName: 'Meena', developer: 'Google', releaseDate: 'January 2020', parameters: '2.6 billion', primaryApplication: 'Conversational AI' },
    { modelName: 'BigGAN', developer: 'Google', releaseDate: 'September 2018', parameters: 'Unlimited', primaryApplication: 'Image Generation' },
    { modelName: 'Electra', developer: 'Google', releaseDate: 'March 2020', parameters: '14 million', primaryApplication: 'Natural Language Understanding' },
    { modelName: 'Swin Transformer', developer: 'Microsoft', releaseDate: 'April 2021', parameters: '88 million', primaryApplication: 'Vision Processing' },
    { modelName: 'GPT-NeoX-20B', developer: 'EleutherAI', releaseDate: 'April 2022', parameters: '20 billion', primaryApplication: 'Natural Language Processing' },
    { modelName: 'Ernie 3.0', developer: 'Baidu', releaseDate: 'July 2021', parameters: '10 billion', primaryApplication: 'Natural Language Processing' },
    { modelName: 'Turing-NLG', developer: 'Microsoft', releaseDate: 'February 2020', parameters: '17 billion', primaryApplication: 'Natural Language Processing' },
    { modelName: 'Wu Dao 2.0', developer: 'Beijing Academy of AI', releaseDate: 'June 2021', parameters: '1.75 trillion', primaryApplication: 'Multimodal Processing' },
    { modelName: 'Jukebox', developer: 'OpenAI', releaseDate: 'April 2020', parameters: '1.2 billion', primaryApplication: 'Music Generation' },
    { modelName: 'StyleGAN2', developer: 'NVIDIA', releaseDate: 'February 2020', parameters: 'Unlimited', primaryApplication: 'Image Generation' },
    { modelName: 'FLAN', developer: 'Google', releaseDate: 'December 2021', parameters: '137 billion', primaryApplication: 'Few-shot Learning' },
    { modelName: 'GShard', developer: 'Google', releaseDate: 'June 2020', parameters: '600 billion', primaryApplication: 'Multilingual Understanding' },
    { modelName: 'AlphaFold', developer: 'DeepMind', releaseDate: 'December 2020', parameters: 'Unknown', primaryApplication: 'Protein Folding' },
    { modelName: 'GPT-J', developer: 'EleutherAI', releaseDate: 'June 2021', parameters: '6 billion', primaryApplication: 'Natural Language Processing' },
    { modelName: 'M6', developer: 'Alibaba', releaseDate: 'December 2020', parameters: '10 billion', primaryApplication: 'Multimodal Processing' },
    { modelName: 'Megatron-Turing NLG', developer: 'NVIDIA & Microsoft', releaseDate: 'October 2021', parameters: '530 billion', primaryApplication: 'Natural Language Processing' },
    { modelName: 'DeepSpeed', developer: 'Microsoft', releaseDate: 'February 2020', parameters: 'Not disclosed', primaryApplication: 'AI Training Optimization' },
  ];

  // Variables para búsqueda y paginación
  searchQuery: string = '';
  itemsPerPage: number = 5;
  currentPage: number = 1;

  // Arrays auxiliares
  filteredData: LLMItem[] = [];
  paginatedData: LLMItem[] = [];

  // Getter para calcular el total de páginas
  get totalPages(): number {
    return Math.ceil(this.filteredData.length / this.itemsPerPage);
  }

  ngOnInit(): void {
    // Inicializamos filtrando (muestra todos los datos)
    this.filterData();
  }

  // Filtrar datos basado en la búsqueda
  filterData(): void {
    const query = this.searchQuery.toLowerCase().trim();
    if (query) {
      this.filteredData = this.data.filter(item => {
        return (
          item.modelName.toLowerCase().includes(query) ||
          item.developer.toLowerCase().includes(query) ||
          item.releaseDate.toLowerCase().includes(query) ||
          item.parameters.toLowerCase().includes(query) ||
          item.primaryApplication.toLowerCase().includes(query)
        );
      });
    } else {
      this.filteredData = [...this.data];
    }
    // Reinicia la paginación a la primera página
    this.currentPage = 1;
    this.updatePagination();
  }

  // Actualiza los datos mostrados en la página actual
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
}
