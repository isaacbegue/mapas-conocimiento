import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, Inject, PLATFORM_ID, Renderer2, Output, EventEmitter } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import cytoscape, { Core, ElementDefinition, LayoutOptions, NodeSingular } from 'cytoscape';
import edgehandles /*, { EdgeHandlesOptions } // Podemos quitar EdgeHandlesOptions si causa problemas */ from 'cytoscape-edgehandles';
import { KnowledgeMapDataService } from '../knowledge-map-data.service';
import { Subscription, combineLatest } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

if (typeof (cytoscape as any).prototype.edgehandles === 'undefined') {
  cytoscape.use(edgehandles);
}

export interface SelectionChangeEvent {
  id: string | null;
  type: 'node' | 'edge' | null;
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

  @Output() selectionChanged = new EventEmitter<SelectionChangeEvent>();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private renderer: Renderer2,
    private elementRef: ElementRef,
    public knowledgeMapDataService: KnowledgeMapDataService
  ) { }

  ngOnInit(): void {
    // init en ngAfterViewInit
  }

  public get selectedElementId(): string | null {
    return this._selectedElementId;
  }

  public get selectedElementType(): 'node' | 'edge' | null {
    return this._selectedElementType;
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      console.log('Running in browser (GraphCanvasComponent - ngAfterViewInit).');
      setTimeout(() => {
        this.initializeCytoscape();
        this.initializeEdgeHandles();
        this.subscribeToDataChanges();
      }, 0);
    } else {
      console.log('Not running in browser (SSR phase), skipping Cytoscape initialization in GraphCanvasComponent.');
    }
  }

  private initializeCytoscape(): void {
    console.log('Attempting to initialize Cytoscape.');
    let containerElement: HTMLDivElement | null = null;
    if (this.cyDiv && this.cyDiv.nativeElement) {
      containerElement = this.cyDiv.nativeElement;
    } else {
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
      style: [ /* ... estilos (sin cambios) ... */
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
            'border-color': 'black'
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': 'blue',
            'border-width': 3
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
            'target-arrow-color': '#ccc',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '10px',
            'text-rotation': 'autorotate',
            'text-margin-y': -10
          }
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': 'blue',
            'target-arrow-color': 'blue',
            'width': 4
          }
        },
        {
          selector: '.eh-handle',
          style: {
            'background-color': 'red',
            'width': 12,
            'height': 12,
            'shape': 'ellipse',
            'overlay-opacity': 0,
            'border-width': 12, 
            'border-opacity': 0
          }
        },
        {
          selector: '.eh-hover',
          style: {
            'background-color': 'red'
          }
        },
        {
          selector: '.eh-source',
          style: {
            'border-width': 2,
            'border-color': 'red'
          }
        },
        {
          selector: '.eh-target',
          style: {
            'border-width': 2,
            'border-color': 'red'
          }
        },
        {
          selector: '.eh-ghost-edge',
          style: {
            'line-color': 'red',
            'target-arrow-color': 'red',
            'target-arrow-shape': 'triangle',
            'opacity': 0.5
          }
        }
      ],
    });

    this.cy.on('tap', 'node, edge', (event: cytoscape.EventObject) => {
      const tappedElement = event.target;
      this._selectedElementId = tappedElement.id();
      this._selectedElementType = tappedElement.isNode() ? 'node' : 'edge';
      this.selectionChanged.emit({ id: this._selectedElementId, type: this._selectedElementType });
      console.log('Elemento seleccionado:', this._selectedElementId, tappedElement.data(), 'Type:', this._selectedElementType);
    });

    this.cy.on('tap', (event: cytoscape.EventObject) => {
      if (event.target === this.cy) { 
        this._selectedElementId = null;
        this._selectedElementType = null;
        this.selectionChanged.emit({ id: null, type: null });
        console.log('Selección limpiada');
      }
    });

    this.cy.userZoomingEnabled(true);
    this.cy.userPanningEnabled(true);
    this.cy.boxSelectionEnabled(true);

    console.log('Cytoscape instance created.');
  }

  private initializeEdgeHandles(): void {
    if (!this.cy) return;

    // Declaramos las opciones como 'any' para evitar la comprobación estricta de tipos aquí.
    // La comprobación de tipos se delega a la biblioteca JS subyacente.
    const edgeHandlesOptions: any = { // <<<<<<<<<<<<<<< CAMBIO PRINCIPAL AQUÍ
      snap: true,
      handleNodes: 'node', 
      handlePosition: 'middle middle',
      edgeType: (_sourceNode: NodeSingular, _targetNode: NodeSingular) => 'flat',
      loopAllowed: (_node: NodeSingular) => false,
      complete: (sourceNode: NodeSingular, targetNode: NodeSingular, addedEles: any) => {
        console.log('Edgehandle complete:', sourceNode.id(), targetNode.id());
        addedEles.remove();
        const label = prompt('Etiqueta para la nueva relación (opcional):');
        if (label !== null) {
          this.knowledgeMapDataService.addEdge(sourceNode.id(), targetNode.id(), label || '');
        }
      }
    };
    
    // La llamada a .edgehandles() ya tenía un (as any) para las opciones, que es correcto.
    this.eh = (this.cy as any).edgehandles(edgeHandlesOptions); 

    console.log('Cytoscape edgehandles initialized.');
  }


  private subscribeToDataChanges(): void {
    if (!this.cy) {
      console.warn('Cytoscape not initialized in subscribeToDataChanges, re-attempting soon.');
      setTimeout(() => this.subscribeToDataChanges(), 100);
      return;
    }
    this.dataSubscription = combineLatest([
      this.knowledgeMapDataService.nodes$,
      this.knowledgeMapDataService.edges$
    ]).pipe(
      debounceTime(50)
    ).subscribe(([nodes, edges]: [ElementDefinition[], ElementDefinition[]]) => {
      if (this.cy && this.currentLayoutOptions) {
        console.log('Data changed, updating Cytoscape graph.');
        const allElements = [...nodes, ...edges];

        this.cy.batch(() => {
          this.cy.elements().remove();
          this.cy.add(allElements);
        });

        const layout = this.cy.layout(this.currentLayoutOptions);
        if (layout && typeof layout.run === 'function') {
          layout.run();
        } else {
          console.warn('Could not re-run layout.');
        }
        
        if (this._selectedElementId) {
          const elToSelect = this.cy.getElementById(this._selectedElementId);
          if (elToSelect.length > 0 && !elToSelect.selected()) { 
            elToSelect.select();
          } else if (elToSelect.length === 0) {
            if (this._selectedElementId !== null) { 
                this._selectedElementId = null;
                this._selectedElementType = null;
                this.selectionChanged.emit({ id: null, type: null });
            }
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
      if (label !== null) {
        const nodes = this.knowledgeMapDataService.getCurrentNodes();
        if (nodes.find((n: ElementDefinition) => n.data.id === sourceId) && 
            nodes.find((n: ElementDefinition) => n.data.id === targetId)) {
          this.knowledgeMapDataService.addEdge(sourceId, targetId, label || '');
        } else {
          alert("Uno o ambos nodos (origen o destino) no existen.");
        }
      }
    } else if (sourceId && !targetId && targetId !== null) { 
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
        }
      } else {
         alert("El elemento seleccionado ya no existe en el grafo.");
         this._selectedElementId = null;
         this._selectedElementType = null;
         this.selectionChanged.emit({ id: null, type: null });
      }
    } else {
      alert("No hay ningún elemento seleccionado.");
    }
  }

  ngOnDestroy(): void {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
      console.log('Data subscription unsubscribed.');
    }
    if (isPlatformBrowser(this.platformId) && this.eh && typeof this.eh.destroy === 'function') {
      this.eh.destroy(); 
      console.log('Cytoscape edgehandles destroyed.');
    }
    if (isPlatformBrowser(this.platformId) && this.cy) {
      this.cy.destroy();
      console.log('Cytoscape instance destroyed.');
    }
  }
}