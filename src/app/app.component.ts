import { Component, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphCanvasComponent, SelectionChangeEvent } from './graph-canvas/graph-canvas.component';
import { PropertiesPanelComponent } from './properties-panel/properties-panel.component';
import { ElementDefinition } from 'cytoscape'; // <<<<<<<<<<<<<<< AÑADIR ESTA IMPORTACIÓN

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    GraphCanvasComponent,
    PropertiesPanelComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
  title = 'mapas-conocimiento';

  @ViewChild('graphCanvasComponent') graphCanvas!: GraphCanvasComponent;

  panelElementId: string | null = null;
  panelElementType: 'node' | 'edge' | null = null;

  constructor(private cdRef: ChangeDetectorRef) {} 

  ngAfterViewInit() {
    // console.log('AppComponent AfterViewInit, graphCanvas:', this.graphCanvas);
  }

  handleSelectionChange(event: SelectionChangeEvent): void {
    this.panelElementId = event.id;
    this.panelElementType = event.type;
    // console.log('AppComponent: Selection changed to', event);
  }

  onAddConcept(): void {
    if (this.graphCanvas) {
      this.graphCanvas.addNewConcept();
    }
  }

  onAddRelation(): void {
    if (this.graphCanvas) {
      this.graphCanvas.addNewRelation();
    }
  }

  onAddRelationAny(): void {
      if (this.graphCanvas) {
          const sourceId = prompt("ID del nodo origen:");
          if (!sourceId) return;
          const targetId = prompt("ID del nodo destino:");
          if (!targetId) return;
          const label = prompt("Etiqueta de la relación (opcional):");
          if (label === null) return;

          const nodes = this.graphCanvas.knowledgeMapDataService.getCurrentNodes();
          // El tipado explícito de 'n' como ElementDefinition requiere la importación
          if (nodes.find((n: ElementDefinition) => n.data.id === sourceId) && 
              nodes.find((n: ElementDefinition) => n.data.id === targetId)) {
            this.graphCanvas.knowledgeMapDataService.addEdge(sourceId, targetId, label || '');
          } else {
            alert("Uno o ambos nodos (origen o destino) no existen.");
          }
      }
  }

  onDeleteSelected(): void {
    if (this.graphCanvas) {
      this.graphCanvas.deleteSelected();
    }
  }

  onRenameSelected(): void {
   alert("Usa el panel de propiedades para renombrar el elemento seleccionado.");
  }
}