import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphCanvasComponent } from './graph-canvas/graph-canvas.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    GraphCanvasComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'mapas-conocimiento';
}