import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CultivoService } from './services/Cultivo.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: "./app.component.html"
})
export class AppComponent  {
  
  constructor(){

  }
 

}
