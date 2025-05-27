import { Component, Input, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// Import EdgeDirection and KnowledgeMapDataService
import { KnowledgeMapDataService, EdgeDirection } from '../knowledge-map-data.service';
import { ElementDefinition } from 'cytoscape';

@Component({
  selector: 'app-properties-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './properties-panel.component.html',
  styleUrls: ['./properties-panel.component.scss']
})
export class PropertiesPanelComponent implements OnInit, OnChanges {
  @Input() elementId: string | null = null;
  @Input() elementType: 'node' | 'edge' | null = null;
  @Input() selectedElementFullData: any = null; // For receiving full data, including direction

  selectedElementData: any = null;
  editableName: string = '';
  editableLabel: string = '';
  editableDirection: EdgeDirection = 'none'; // Default value

  availableDirections: { label: string; value: EdgeDirection }[] = [
    { label: 'Ninguna', value: 'none' },
    { label: 'Origen -> Destino', value: 'source-to-target' },
    { label: 'Destino -> Origen', value: 'target-to-source' },
    { label: 'Ambas Direcciones', value: 'both' }
  ];

  constructor(private knowledgeMapDataService: KnowledgeMapDataService) {}

  ngOnInit(): void {
    this.loadElementData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Watch for changes on elementId, elementType, or the full data object
    if (changes['elementId'] || changes['elementType'] || changes['selectedElementFullData']) {
      this.loadElementData();
    }
  }

  private loadElementData(): void {
    if (!this.elementId || !this.elementType) {
      this.selectedElementData = null;
      this.editableName = '';
      this.editableLabel = '';
      this.editableDirection = 'none'; // Reset direction
      return;
    }

    // Try to use selectedElementFullData if provided by GraphCanvasComponent's selection event
    // Otherwise, fall back to fetching from service (less ideal but a backup)
    const dataToUse = this.selectedElementFullData && this.selectedElementFullData.id === this.elementId
                     ? this.selectedElementFullData
                     : null;

    if (dataToUse) {
        this.selectedElementData = { ...dataToUse }; // Create a copy
        if (this.elementType === 'node') {
            this.editableName = this.selectedElementData.name || '';
            this.editableLabel = '';
            this.editableDirection = 'none';
        } else if (this.elementType === 'edge') {
            this.editableLabel = this.selectedElementData.label || '';
            // Use bracket notation to access 'direction' safely
            this.editableDirection = this.selectedElementData['direction'] as EdgeDirection || 'none';
            this.editableName = '';
        }
    } else {
        // Fallback to fetching from service if selectedElementFullData is not available or mismatched
        let element: ElementDefinition | undefined;
        if (this.elementType === 'node') {
            element = this.knowledgeMapDataService.getCurrentNodes().find(n => n.data['id'] === this.elementId);
        } else if (this.elementType === 'edge') {
            element = this.knowledgeMapDataService.getCurrentEdges().find(e => e.data['id'] === this.elementId);
        }

        if (element && element.data) {
            this.selectedElementData = { ...element.data };
            if (this.elementType === 'node') {
                this.editableName = this.selectedElementData['name'] || '';
                this.editableLabel = '';
                this.editableDirection = 'none';
            } else if (this.elementType === 'edge') {
                this.editableLabel = this.selectedElementData['label'] || '';
                this.editableDirection = this.selectedElementData['direction'] as EdgeDirection || 'none';
                this.editableName = '';
            }
        } else {
            this.selectedElementData = null;
            this.editableName = '';
            this.editableLabel = '';
            this.editableDirection = 'none';
        }
    }
  }

  onSaveChanges(): void {
    if (!this.elementId || !this.selectedElementData) return;

    if (this.elementType === 'node') {
      if (this.editableName !== this.selectedElementData['name']) {
        this.knowledgeMapDataService.updateNodeName(this.elementId, this.editableName);
      }
    } else if (this.elementType === 'edge') {
      let edgeUpdated = false;
      if (this.editableLabel !== this.selectedElementData['label']) {
        this.knowledgeMapDataService.updateEdgeLabel(this.elementId, this.editableLabel);
        edgeUpdated = true;
      }
      // Also save direction if it changed
      if (this.editableDirection !== (this.selectedElementData['direction'] as EdgeDirection)) {
        this.knowledgeMapDataService.updateEdgeDirection(this.elementId, this.editableDirection);
        edgeUpdated = true;
      }
      // if (edgeUpdated) {
      //   // Optional: Refresh panel data after save, though service updates should trigger canvas
      // }
    }
  }

  onCancel(): void {
    this.loadElementData(); // Discard changes by reloading original data
  }
}