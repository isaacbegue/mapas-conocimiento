import { Component, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphCanvasComponent, SelectionChangeEvent } from './graph-canvas/graph-canvas.component';
import { PropertiesPanelComponent } from './properties-panel/properties-panel.component';
import { ElementDefinition } from 'cytoscape';

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
  panelElementFullData: any = null; // To hold the full data of the selected element

  constructor(private cdRef: ChangeDetectorRef) {}

  ngAfterViewInit() {
    // console.log('AppComponent AfterViewInit, graphCanvas:', this.graphCanvas);
  }

  handleSelectionChange(event: SelectionChangeEvent): void {
    this.panelElementId = event.id;
    this.panelElementType = event.type;
    this.panelElementFullData = event.data; // Store the full data from the event
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
          if (label === null) return; // User cancelled prompt

          const nodes = this.graphCanvas.knowledgeMapDataService.getCurrentNodes();
          // Access 'id' using bracket notation for safety, though it's a standard property
          if (nodes.find((n: ElementDefinition) => n.data && n.data['id'] === sourceId) &&
              nodes.find((n: ElementDefinition) => n.data && n.data['id'] === targetId)) {
            // Assuming addEdge in service now takes direction as a 4th param
            this.graphCanvas.knowledgeMapDataService.addEdge(sourceId, targetId, label || '', 'source-to-target');
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