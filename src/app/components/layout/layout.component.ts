import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { FooterComponent } from '../footer/footer.component';
import { CultivoService } from '../../services/Cultivo.service';
import { ComercialServiceService } from '../../services/Comercial.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [SidebarComponent, FooterComponent, RouterOutlet],
  templateUrl: './layout.component.html'
})
export class LayoutComponent implements OnInit {
  

  constructor(){
   
  }

  ngOnInit(): void {
    
  }
    

}
