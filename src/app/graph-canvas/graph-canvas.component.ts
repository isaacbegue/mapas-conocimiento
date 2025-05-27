import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, Inject, PLATFORM_ID, Renderer2, Output, EventEmitter } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import cytoscape, { Core, ElementDefinition, LayoutOptions, NodeSingular, EdgeSingular } from 'cytoscape';
import edgehandles from 'cytoscape-edgehandles';
import { KnowledgeMapDataService, EdgeDirection } from '../knowledge-map-data.service'; // Correct import
import { Subscription, combineLatest } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

if (typeof (cytoscape as any).prototype.edgehandles === 'undefined') {
  cytoscape.use(edgehandles);
}

export interface SelectionChangeEvent {
  id: string | null;
  type: 'node' | 'edge' | null;
  data?: any; // To pass full element data
}

@Component({
  selector: 'app-graph-canvas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './graph-canvas.component.html',
  styleUrls: ['./graph-canvas.component.scss']
})
export class GraphCanvasComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('cy') private cyDiv!: ElementRef<HTMLDivElement>;
  private cy!: Core;
  private eh: any;
  private dataSubscription!: Subscription;
  private currentLayoutOptions!: LayoutOptions;

  private _selectedElementId: string | null = null;
  private _selectedElementType: 'node' | 'edge' | null = null;
  private _selectedElementData: any = null; // Stores a copy of the selected element's data

  private _sourceNodeForQuickRelation: NodeSingular | null = null;

  @Output() selectionChanged = new EventEmitter<SelectionChangeEvent>();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private renderer: Renderer2,
    private elementRef: ElementRef,
    public knowledgeMapDataService: KnowledgeMapDataService
  ) { }

  ngOnInit(): void {
    // Initialization is deferred to ngAfterViewInit for browser-specific code
  }

  public get selectedElementId(): string | null {
    return this._selectedElementId;
  }

  public get selectedElementType(): 'node' | 'edge' | null {
    return this._selectedElementType;
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // console.log('Running in browser (GraphCanvasComponent - ngAfterViewInit).');
      // Use setTimeout to ensure the view is fully initialized, especially #cy div
      setTimeout(() => {
        this.initializeCytoscape();
        this.initializeEdgeHandles();
        this.subscribeToDataChanges();
      }, 0);
    } else {
      // console.log('Not running in browser (SSR phase), skipping Cytoscape initialization in GraphCanvasComponent.');
    }
  }

  private initializeCytoscape(): void {
    // console.log('Attempting to initialize Cytoscape.');
    let containerElement: HTMLDivElement | null = null;
    if (this.cyDiv && this.cyDiv.nativeElement) {
      containerElement = this.cyDiv.nativeElement;
    } else {
      // Fallback if ViewChild isn't ready (less likely with setTimeout but safe)
      containerElement = this.elementRef.nativeElement.querySelector('#cy');
    }

    if (!containerElement) {
      console.error("Cytoscape container div not found!");
      return;
    }

    this.currentLayoutOptions = {
      name: 'cose',
      animate: false,
      padding: 30,
      fit: true,
      idealEdgeLength: (_edge: any) => 100,
      nodeOverlap: 20,
      refresh: 20,
      randomize: false,
      componentSpacing: 100,
      nodeRepulsion: (_node: any) => 400000,
      edgeElasticity: (_edge: any) => 100,
      nestingFactor: 5,
      gravity: 80,
      numIter: 1000,
      initialTemp: 200,
      coolingFactor: 0.95,
      minTemp: 1.0
    };

    this.cy = cytoscape({
      container: containerElement,
      elements: [],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#666',
            'label': 'data(name)',
            'width': 'label',
            'height': 'label',
            'padding': '10px',
            'text-valign': 'center',
            'text-halign': 'center',
            'shape': 'round-rectangle',
            'border-width': 2,
            'border-color': 'black',
            'color': 'white',
            'text-outline-width': 2,
            'text-outline-color': '#666'
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': 'blue',
            'border-width': 3,
            'text-outline-color': 'blue'
          }
        },
        {
          selector: 'node[parent]',
          style: {
            'background-opacity': 0.333,
            'background-color': '#2773b2',
            'border-width': 2,
            'border-color': '#1a5a93',
            'label': 'data(name)',
            'text-valign': 'top',
            'text-halign': 'center',
            'padding': '20px'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 3,
            'line-color': '#ccc',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '10px',
            'text-background-color': '#f9f9f9',
            'text-background-opacity': 0.7,
            'text-background-padding': '2px',
            'text-rotation': 'autorotate',
            'text-margin-y': -10,
            'source-arrow-shape': 'none',
            'target-arrow-shape': 'none'
          }
        },
        {
          selector: 'edge[direction="source-to-target"]',
          style: {
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#ccc',
            'source-arrow-shape': 'none',
          }
        },
        {
          selector: 'edge[direction="target-to-source"]',
          style: {
            'source-arrow-shape': 'triangle',
            'source-arrow-color': '#ccc',
            'target-arrow-shape': 'none',
          }
        },
        {
          selector: 'edge[direction="both"]',
          style: {
            'source-arrow-shape': 'triangle',
            'source-arrow-color': '#ccc',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#ccc',
          }
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': 'blue',
            'width': 4,
            'text-background-color': '#e0e0ff',
            // Default selected arrow colors, will be overridden by specific direction if selected
            'target-arrow-color': 'blue',
            'source-arrow-color': 'blue',
          }
        },
        {
          selector: 'edge:selected[direction="source-to-target"]',
          style: { 'target-arrow-color': 'blue', 'source-arrow-shape': 'none' }
        },
        {
          selector: 'edge:selected[direction="target-to-source"]',
          style: { 'source-arrow-color': 'blue', 'target-arrow-shape': 'none' }
        },
        {
          selector: 'edge:selected[direction="both"]',
          style: { 'source-arrow-color': 'blue', 'target-arrow-color': 'blue' }
        },
        {
          selector: '.eh-handle',
          style: {
            'background-color': 'red', 'width': 12, 'height': 12, 'shape': 'ellipse',
            'overlay-opacity': 0, 'border-width': 12, 'border-opacity': 0
          }
        },
        { selector: '.eh-hover', style: { 'background-color': 'red' } },
        { selector: '.eh-source', style: { 'border-width': 2, 'border-color': 'red' } },
        { selector: '.eh-target', style: { 'border-width': 2, 'border-color': 'red' } },
        {
          selector: '.eh-ghost-edge',
          style: { 'line-color': 'red', 'target-arrow-color': 'red', 'target-arrow-shape': 'triangle', 'opacity': 0.5 }
        }
      ],
    });

    this.cy.on('tap', 'node', (event: cytoscape.EventObject) => {
      const tappedNode = event.target as NodeSingular;

      if (event.originalEvent && (event.originalEvent as MouseEvent).ctrlKey) {
        if (this._sourceNodeForQuickRelation && this._sourceNodeForQuickRelation.id() !== tappedNode.id()) {
          const sourceId = this._sourceNodeForQuickRelation.id();
          const targetId = tappedNode.id();
          const label = prompt(`Etiqueta para la nueva relación (opcional) desde "${this._sourceNodeForQuickRelation.data('name')}" hacia "${tappedNode.data('name')}":`);

          if (label !== null) {
            this.knowledgeMapDataService.addEdge(sourceId, targetId, label || '', 'source-to-target');
          }

          const sourceNodeToUnselect = this._sourceNodeForQuickRelation;
          this._sourceNodeForQuickRelation = null;

          tappedNode.unselect(); // Unselect the target of the Ctrl+Click
          if (sourceNodeToUnselect) {
            sourceNodeToUnselect.unselect(); // Unselect the original source
          }

          this._selectedElementId = null;
          this._selectedElementType = null;
          this._selectedElementData = null;
          this.selectionChanged.emit({ id: null, type: null, data: null });

        } else if (!this._sourceNodeForQuickRelation || this._sourceNodeForQuickRelation.id() === tappedNode.id()) {
          // This is the first node in a potential Ctrl+Click pair, or Ctrl+Click on the same node
          this._sourceNodeForQuickRelation = tappedNode;
          // Select it normally and emit for the properties panel
          this._selectedElementId = tappedNode.id();
          this._selectedElementType = 'node';
          this._selectedElementData = { ...tappedNode.data() }; // Store a copy
          this.selectionChanged.emit({ id: this._selectedElementId, type: this._selectedElementType, data: this._selectedElementData });
          // console.log('Nodo origen para relación rápida:', tappedNode.id());
        }
      } else {
        // Normal click (not Ctrl+Click)
        this._selectedElementId = tappedNode.id();
        this._selectedElementType = 'node';
        this._selectedElementData = { ...tappedNode.data() }; // Store a copy
        this._sourceNodeForQuickRelation = tappedNode; // Set as potential source for next Ctrl+Click
        this.selectionChanged.emit({ id: this._selectedElementId, type: this._selectedElementType, data: this._selectedElementData });
        // console.log('Elemento seleccionado (posible origen para relación):', this._selectedElementId);
      }
    });

    this.cy.on('tap', 'edge', (event: cytoscape.EventObject) => {
      const tappedEdge = event.target as EdgeSingular;
      this._selectedElementId = tappedEdge.id();
      this._selectedElementType = 'edge';
      this._selectedElementData = { ...tappedEdge.data() }; // Store a copy
      this._sourceNodeForQuickRelation = null; // Clear source node if an edge is selected
      this.selectionChanged.emit({ id: this._selectedElementId, type: this._selectedElementType, data: this._selectedElementData });
      // console.log('Elemento seleccionado:', this._selectedElementId);
    });

    this.cy.on('tap', (event: cytoscape.EventObject) => {
      if (event.target === this.cy) { // Click on background
        this._selectedElementId = null;
        this._selectedElementType = null;
        this._selectedElementData = null;
        this._sourceNodeForQuickRelation = null; // Clear source node on background click
        this.selectionChanged.emit({ id: null, type: null, data: null });
        // console.log('Selección limpiada');
      }
    });

    this.cy.userZoomingEnabled(true);
    this.cy.userPanningEnabled(true);
    this.cy.boxSelectionEnabled(true);

    // console.log('Cytoscape instance created.');
  }

  private initializeEdgeHandles(): void {
    if (!this.cy) return;
    const edgeHandlesOptions: any = {
      snap: true,
      handleNodes: 'node',
      handlePosition: 'middle middle',
      edgeType: (_sourceNode: NodeSingular, _targetNode: NodeSingular) => 'flat',
      loopAllowed: (_node: NodeSingular) => false,
      complete: (sourceNode: NodeSingular, targetNode: NodeSingular, addedEles: any) => {
        // console.log('Edgehandle complete:', sourceNode.id(), targetNode.id());
        addedEles.remove(); // Remove the temporary edge handle
        const label = prompt('Etiqueta para la nueva relación (opcional):');
        if (label !== null) { // User didn't cancel prompt
          this.knowledgeMapDataService.addEdge(sourceNode.id(), targetNode.id(), label || '', 'source-to-target');
        }
      }
    };
    this.eh = (this.cy as any).edgehandles(edgeHandlesOptions);
    // console.log('Cytoscape edgehandles initialized.');
  }


  private subscribeToDataChanges(): void {
    if (!this.cy) {
      // console.warn('Cytoscape not initialized in subscribeToDataChanges, re-attempting soon.');
      setTimeout(() => this.subscribeToDataChanges(), 100);
      return;
    }
    this.dataSubscription = combineLatest([
      this.knowledgeMapDataService.nodes$,
      this.knowledgeMapDataService.edges$
    ]).pipe(
      debounceTime(50) // Debounce to avoid rapid updates
    ).subscribe(([nodes, edges]: [ElementDefinition[], ElementDefinition[]]) => {
      if (this.cy && this.currentLayoutOptions) {
        // console.log('Data changed, updating Cytoscape graph.');
        const allElements = [...nodes, ...edges];
        const selectedIdBeforeUpdate = this._selectedElementId;

        this.cy.batch(() => {
          this.cy.elements().remove();
          this.cy.add(allElements);
        });

        const layout = this.cy.layout(this.currentLayoutOptions);
        if (layout && typeof layout.run === 'function') {
          layout.run();
        } else {
          // console.warn('Could not re-run layout.');
        }

        // Attempt to re-select the previously selected element
        if (selectedIdBeforeUpdate) {
          const elToReselect = this.cy.getElementById(selectedIdBeforeUpdate);
          if (elToReselect.length > 0) {
            elToReselect.select();
            // No need to re-emit selection here if the panel already gets data from appComponent
            // and appComponent's selection state (panelElementId) isn't changing
            // unless the data object itself for that ID has changed significantly
            // For now, let's keep it simple and not re-emit unless data truly changed.
            // this._selectedElementId = elToReselect.id(); // Already set
            // this._selectedElementType = elToReselect.isNode() ? 'node' : 'edge'; // Already set
            this._selectedElementData = { ...elToReselect.data() }; // Update local data copy
            // Optionally re-emit if data content might have changed and panel needs a refresh
            // this.selectionChanged.emit({ id: this._selectedElementId, type: this._selectedElementType, data: this._selectedElementData });

          } else {
            // Element was removed, clear selection in this component
            this._selectedElementId = null;
            this._selectedElementType = null;
            this._selectedElementData = null;
            this._sourceNodeForQuickRelation = null;
            // Notify parent that selection is cleared
            this.selectionChanged.emit({ id: null, type: null, data: null });
          }
        }
      }
    });
  }

  addNewConcept(): void {
    const name = prompt("Nombre del nuevo concepto:");
    if (name) {
      this.knowledgeMapDataService.addNode(name);
    }
  }

  addNewRelation(): void {
    let sourceId: string | null = null;
    let targetId: string | null = null;

    if (this._selectedElementId && this._selectedElementType === 'node') {
      sourceId = this._selectedElementId;
      targetId = prompt(`ID del nodo destino (origen es ${sourceId}):`);
    } else {
      alert("Por favor, selecciona un nodo de origen primero para usar esta función.");
      return;
    }

    if (sourceId && targetId) {
      const label = prompt("Etiqueta de la relación (opcional):");
      if (label !== null) { // User didn't cancel prompt
        const nodes = this.knowledgeMapDataService.getCurrentNodes();
        // Ensure IDs are accessed correctly on data object
        if (nodes.find((n: ElementDefinition) => n.data['id'] === sourceId) &&
          nodes.find((n: ElementDefinition) => n.data['id'] === targetId)) {
          this.knowledgeMapDataService.addEdge(sourceId, targetId, label || '', 'source-to-target');
        } else {
          alert("Uno o ambos nodos (origen o destino) no existen.");
        }
      }
    } else if (sourceId && !targetId && targetId !== null) { // Check if targetId prompt was cancelled
      alert("Se requiere un nodo destino.");
    }
  }

  deleteSelected(): void {
    if (this._selectedElementId) {
      const el = this.cy.getElementById(this._selectedElementId);
      if (el.length > 0) {
        const elData = el.data();
        const elementName = elData.name || elData.label || this._selectedElementId;
        if (confirm(`¿Seguro que quieres eliminar el elemento "${elementName}"?`)) {
          this.knowledgeMapDataService.removeElement(this._selectedElementId);
          // Selection will be cleared via dataSubscription if the element is indeed removed
        }
      } else {
         alert("El elemento seleccionado ya no existe en el grafo.");
         this._selectedElementId = null;
         this._selectedElementType = null;
         this._selectedElementData = null;
         this._sourceNodeForQuickRelation = null;
         this.selectionChanged.emit({ id: null, type: null, data: null });
      }
    } else {
      alert("No hay ningún elemento seleccionado.");
    }
  }

  ngOnDestroy(): void {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
      // console.log('Data subscription unsubscribed.');
    }
    if (isPlatformBrowser(this.platformId) && this.eh && typeof this.eh.destroy === 'function') {
      this.eh.destroy();
      // console.log('Cytoscape edgehandles destroyed.');
    }
    if (isPlatformBrowser(this.platformId) && this.cy) {
      this.cy.destroy();
      // console.log('Cytoscape instance destroyed.');
    }
  }
}