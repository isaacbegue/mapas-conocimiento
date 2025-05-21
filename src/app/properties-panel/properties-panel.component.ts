import { Component, Input, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Importa FormsModule
import { KnowledgeMapDataService } from '../knowledge-map-data.service';
import { ElementDefinition } from 'cytoscape';

@Component({
  selector: 'app-properties-panel',
  standalone: true,
  imports: [CommonModule, FormsModule], // Añade FormsModule a imports
  templateUrl: './properties-panel.component.html',
  styleUrls: ['./properties-panel.component.scss']
})
export class PropertiesPanelComponent implements OnInit, OnChanges {
  @Input() elementId: string | null = null;
  @Input() elementType: 'node' | 'edge' | null = null;

  selectedElementData: any = null; // Para almacenar data del elemento (ej: { id: 'a', name: 'Concepto A' })
  editableName: string = '';
  editableLabel: string = '';

  constructor(private knowledgeMapDataService: KnowledgeMapDataService) {}

  ngOnInit(): void {
    this.loadElementData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['elementId'] || changes['elementType']) {
      this.loadElementData();
    }
  }

  private loadElementData(): void {
    if (!this.elementId || !this.elementType) {
      this.selectedElementData = null;
      this.editableName = '';
      this.editableLabel = '';
      return;
    }

    let element: ElementDefinition | undefined;
    if (this.elementType === 'node') {
      element = this.knowledgeMapDataService.getCurrentNodes().find(n => n.data.id === this.elementId);
    } else if (this.elementType === 'edge') {
      element = this.knowledgeMapDataService.getCurrentEdges().find(e => e.data.id === this.elementId);
    }

    if (element) {
      this.selectedElementData = { ...element.data }; // Copia para evitar mutación directa
      if (this.elementType === 'node') {
        this.editableName = this.selectedElementData.name || '';
        this.editableLabel = ''; // Limpiar por si antes había una arista seleccionada
      } else if (this.elementType === 'edge') {
        this.editableLabel = this.selectedElementData.label || '';
        this.editableName = ''; // Limpiar por si antes había un nodo seleccionado
      }
    } else {
      this.selectedElementData = null;
      this.editableName = '';
      this.editableLabel = '';
    }
  }

  onSaveChanges(): void {
    if (!this.elementId || !this.selectedElementData) return;

    if (this.elementType === 'node') {
      if (this.editableName !== this.selectedElementData.name) {
        this.knowledgeMapDataService.updateNodeName(this.elementId, this.editableName);
      }
    } else if (this.elementType === 'edge') {
      if (this.editableLabel !== this.selectedElementData.label) {
        this.knowledgeMapDataService.updateEdgeLabel(this.elementId, this.editableLabel);
      }
    }
    // Opcional: Podrías recargar los datos aquí si es necesario,
    // pero como el servicio actualiza el BehaviorSubject, GraphCanvas ya debería reaccionar.
    // this.loadElementData(); // Para re-sincronizar el panel con los datos del servicio si hay alguna lógica extra
  }

  onCancel(): void {
    // Recargar los datos originales para descartar cambios no guardados en el panel
    this.loadElementData();
  }
}