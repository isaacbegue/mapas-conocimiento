import { Component, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphCanvasComponent } from './graph-canvas/graph-canvas.component';
import { PropertiesPanelComponent } from './properties-panel/properties-panel.component'; // Importa el panel
import { KnowledgeMapDataService } from './knowledge-map-data.service'; // Import the service

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    GraphCanvasComponent,
    PropertiesPanelComponent // Añade el panel a imports
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
  title = 'mapas-conocimiento';

  @ViewChild('graphCanvasComponent') graphCanvas!: GraphCanvasComponent;

  constructor(
    public knowledgeMapDataService: KnowledgeMapDataService, // Inyectar el servicio
    private cdr: ChangeDetectorRef // Inject ChangeDetectorRef
    ) {}

  ngAfterViewInit() {
    // graphCanvas estará disponible aquí
    // Subscribe to service changes to trigger UI updates for button states if necessary
    this.knowledgeMapDataService.nodes$.subscribe(() => this.cdr.detectChanges());
    this.knowledgeMapDataService.edges$.subscribe(() => this.cdr.detectChanges());
  }

  onAddConcept(): void {
    if (this.graphCanvas) {
      this.graphCanvas.addNewConcept();
    }
  }

  onAddRelation(): void {
    if (this.graphCanvas && this.graphCanvas.selectedElementId && this.graphCanvas.selectedElementType === 'node') {
      this.graphCanvas.addNewRelation();
    } else if (this.graphCanvas) {
        alert("Por favor, selecciona un nodo de origen primero.");
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
          if (nodes.find(n => n.data.id === sourceId) && nodes.find(n => n.data.id === targetId)) {
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
    // Esta función ahora será manejada por el panel de propiedades,
    // pero la dejamos por si quieres un acceso rápido sin el panel en algún momento
    // o la eliminamos si el panel es la única vía de renombrar.
    // Por ahora, la comentaremos para evitar confusión.
    /*
    if (this.graphCanvas) {
        this.graphCanvas.renameSelectedElement();
    }
    */
   alert("Usa el panel de propiedades para renombrar el elemento seleccionado.");
  }

  // --- Undo/Redo Methods ---
  onUndo(): void {
    this.knowledgeMapDataService.undo();
    // Consider manually triggering change detection if button states don't update
    // this.cdr.detectChanges(); // Uncomment if needed
  }

  onRedo(): void {
    this.knowledgeMapDataService.redo();
    // this.cdr.detectChanges(); // Uncomment if needed
  }

  canUndo(): boolean {
    return this.knowledgeMapDataService.canUndo();
  }

  canRedo(): boolean {
    return this.knowledgeMapDataService.canRedo();
  }

  // --- Edge Drawing Toggle Methods ---
  onToggleEdgeDrawing(): void {
    if (this.graphCanvas) {
      this.graphCanvas.toggleEdgeDrawingMode();
      this.cdr.detectChanges(); // Ensure button text/state updates
    }
  }

  isEdgeDrawingActive(): boolean {
    return this.graphCanvas ? this.graphCanvas.isEdgeDrawingEnabled : false;
    // Default to false if graphCanvas is not yet available, 
    // though it should be by the time this is relevant.
  }
}