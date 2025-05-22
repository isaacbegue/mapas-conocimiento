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
  propagateToChildren: boolean = false;
  isParentNode: boolean = false;

  // Style properties for nodes
  editableNodeBackgroundColor: string = '#666666';
  editableNodeShape: string = 'round-rectangle';
  editableNodeBorderColor: string = '#000000';
  editableNodeBorderWidth: number = 2;
  editableNodeWidth: string = 'label'; // Can be 'label' or a number
  editableNodeHeight: string = 'label'; // Can be 'label' or a number
  editableNodePadding: string = '10px';

  // Style properties for edges
  editableEdgeLineColor: string = '#cccccc';
  editableEdgeArrowShape: string = 'triangle';
  editableEdgeWidth: number = 3;
  editableEdgeCurveStyle: string = 'bezier';

  // Define supported style options
  nodeShapes: string[] = ['rectangle', 'round-rectangle', 'ellipse', 'triangle', 'pentagon', 'hexagon', 'heptagon', 'octagon', 'star', 'barrel', 'diamond', 'vee', 'rhomboid', 'polygon'];
  edgeArrowShapes: string[] = ['triangle', 'triangle-tee', 'circle-triangle', 'triangle-cross', 'triangle-backcurve', 'vee', 'tee', 'square', 'circle', 'diamond', 'none'];
  curveStyles: string[] = ['bezier', 'straight', 'haystack', 'unbundled-bezier', 'segments', 'taxi']; // Added more common styles

  // Default values (can be sourced from service or defined here as fallback)
  // These are used if an element lacks a specific style property.
  private readonly DEFAULT_NODE_BG_COLOR = '#666';
  private readonly DEFAULT_NODE_SHAPE = 'round-rectangle';
  private readonly DEFAULT_NODE_BORDER_COLOR = '#000';
  private readonly DEFAULT_NODE_BORDER_WIDTH = 2;
  private readonly DEFAULT_NODE_WIDTH = 'label';
  private readonly DEFAULT_NODE_HEIGHT = 'label';
  private readonly DEFAULT_NODE_PADDING = '10px';

  private readonly DEFAULT_EDGE_LINE_COLOR = '#ccc';
  private readonly DEFAULT_EDGE_ARROW_SHAPE = 'triangle';
  private readonly DEFAULT_EDGE_WIDTH = 3;
  private readonly DEFAULT_EDGE_CURVE_STYLE = 'bezier';


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
      this.isParentNode = false;
      this.propagateToChildren = false;
      this.resetStyleProperties(); // Reset style fields
      return;
    }

    this.propagateToChildren = false; // Reset on each new selection
    this.isParentNode = false; // Reset on each new selection

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

        // Check if this node is a parent
        const allNodes = this.knowledgeMapDataService.getCurrentNodes();
        for (const node of allNodes) {
          if (node.data.parent === this.elementId) {
            this.isParentNode = true;
            break;
          }
        }

        // Load node style properties
        this.editableNodeBackgroundColor = this.selectedElementData.backgroundColor || this.DEFAULT_NODE_BG_COLOR;
        this.editableNodeShape = this.selectedElementData.shape || this.DEFAULT_NODE_SHAPE;
        this.editableNodeBorderColor = this.selectedElementData.borderColor || this.DEFAULT_NODE_BORDER_COLOR;
        this.editableNodeBorderWidth = this.selectedElementData.borderWidth !== undefined ? this.selectedElementData.borderWidth : this.DEFAULT_NODE_BORDER_WIDTH;
        this.editableNodeWidth = this.selectedElementData.width || this.DEFAULT_NODE_WIDTH;
        this.editableNodeHeight = this.selectedElementData.height || this.DEFAULT_NODE_HEIGHT;
        this.editableNodePadding = this.selectedElementData.padding || this.DEFAULT_NODE_PADDING;

      } else if (this.elementType === 'edge') {
        this.editableLabel = this.selectedElementData.label || '';
        this.editableName = ''; // Limpiar por si antes había un nodo seleccionado

        // Load edge style properties
        this.editableEdgeLineColor = this.selectedElementData.lineColor || this.DEFAULT_EDGE_LINE_COLOR;
        this.editableEdgeArrowShape = this.selectedElementData.arrowShape || this.DEFAULT_EDGE_ARROW_SHAPE;
        this.editableEdgeWidth = this.selectedElementData.edgeWidth !== undefined ? this.selectedElementData.edgeWidth : this.DEFAULT_EDGE_WIDTH;
        this.editableEdgeCurveStyle = this.selectedElementData.curveStyle || this.DEFAULT_EDGE_CURVE_STYLE;
      }
    } else {
      this.selectedElementData = null;
      this.editableName = '';
      this.editableLabel = '';
      this.resetStyleProperties(); // Reset style fields
    }
  }

  private resetStyleProperties(): void {
    this.editableNodeBackgroundColor = this.DEFAULT_NODE_BG_COLOR;
    this.editableNodeShape = this.DEFAULT_NODE_SHAPE;
    this.editableNodeBorderColor = this.DEFAULT_NODE_BORDER_COLOR;
    this.editableNodeBorderWidth = this.DEFAULT_NODE_BORDER_WIDTH;
    this.editableNodeWidth = this.DEFAULT_NODE_WIDTH;
    this.editableNodeHeight = this.DEFAULT_NODE_HEIGHT;
    this.editableNodePadding = this.DEFAULT_NODE_PADDING;

    this.editableEdgeLineColor = this.DEFAULT_EDGE_LINE_COLOR;
    this.editableEdgeArrowShape = this.DEFAULT_EDGE_ARROW_SHAPE;
    this.editableEdgeWidth = this.DEFAULT_EDGE_WIDTH;
    this.editableEdgeCurveStyle = this.DEFAULT_EDGE_CURVE_STYLE;
  }

  onSaveChanges(): void {
    if (!this.elementId || !this.selectedElementData) return;

    if (this.elementType === 'node') {
      if (this.editableName !== this.selectedElementData.name) {
        this.knowledgeMapDataService.updateNodeName(this.elementId, this.editableName);
      }
      // Save node style properties
      const styleUpdates: { propertyName: string, value: any, originalValue: any }[] = [
        { propertyName: 'backgroundColor', value: this.editableNodeBackgroundColor, originalValue: this.selectedElementData.backgroundColor || this.DEFAULT_NODE_BG_COLOR },
        { propertyName: 'shape', value: this.editableNodeShape, originalValue: this.selectedElementData.shape || this.DEFAULT_NODE_SHAPE },
        { propertyName: 'borderColor', value: this.editableNodeBorderColor, originalValue: this.selectedElementData.borderColor || this.DEFAULT_NODE_BORDER_COLOR },
        { propertyName: 'borderWidth', value: this.editableNodeBorderWidth, originalValue: this.selectedElementData.borderWidth !== undefined ? this.selectedElementData.borderWidth : this.DEFAULT_NODE_BORDER_WIDTH },
        { propertyName: 'width', value: this.editableNodeWidth, originalValue: this.selectedElementData.width || this.DEFAULT_NODE_WIDTH },
        { propertyName: 'height', value: this.editableNodeHeight, originalValue: this.selectedElementData.height || this.DEFAULT_NODE_HEIGHT },
        { propertyName: 'padding', value: this.editableNodePadding, originalValue: this.selectedElementData.padding || this.DEFAULT_NODE_PADDING },
      ];

      styleUpdates.forEach(update => {
        if (update.value !== update.originalValue) {
          if (this.isParentNode && this.propagateToChildren) {
            this.knowledgeMapDataService.applyStyleToChildren(this.elementId!, update.propertyName, update.value);
          } else {
            this.knowledgeMapDataService.updateElementStyle(this.elementId!, update.propertyName, update.value);
          }
        }
      });

    } else if (this.elementType === 'edge') {
      if (this.editableLabel !== this.selectedElementData.label) {
        this.knowledgeMapDataService.updateEdgeLabel(this.elementId, this.editableLabel);
      }
      // Save edge style properties - propagation does not apply to edges
      if (this.editableEdgeLineColor !== (this.selectedElementData.lineColor || this.DEFAULT_EDGE_LINE_COLOR)) {
        this.knowledgeMapDataService.updateElementStyle(this.elementId, 'lineColor', this.editableEdgeLineColor);
      }
      if (this.editableEdgeArrowShape !== (this.selectedElementData.arrowShape || this.DEFAULT_EDGE_ARROW_SHAPE)) {
        this.knowledgeMapDataService.updateElementStyle(this.elementId, 'arrowShape', this.editableEdgeArrowShape);
      }
      const currentEdgeWidth = this.selectedElementData.edgeWidth !== undefined ? this.selectedElementData.edgeWidth : this.DEFAULT_EDGE_WIDTH;
      if (this.editableEdgeWidth !== currentEdgeWidth) {
        this.knowledgeMapDataService.updateElementStyle(this.elementId, 'edgeWidth', this.editableEdgeWidth);
      }
      if (this.editableEdgeCurveStyle !== (this.selectedElementData.curveStyle || this.DEFAULT_EDGE_CURVE_STYLE)) {
        this.knowledgeMapDataService.updateElementStyle(this.elementId, 'curveStyle', this.editableEdgeCurveStyle);
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