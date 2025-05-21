import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, Inject, PLATFORM_ID, Renderer2 } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import cytoscape, { Core, ElementDefinition, LayoutOptions, NodeSingular, EdgeSingular } from 'cytoscape';
import { KnowledgeMapDataService } from '../knowledge-map-data.service';
import { Subscription, combineLatest } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

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
  private dataSubscription!: Subscription;
  private currentLayoutOptions!: LayoutOptions;

  selectedElementId: string | null = null;
  selectedElementType: 'node' | 'edge' | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private renderer: Renderer2,
    private elementRef: ElementRef,
    public knowledgeMapDataService: KnowledgeMapDataService
  ) { }

  ngOnInit(): void {
    // Initialization and subscription happen in ngAfterViewInit for browser environment
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      console.log('Running in browser (ngAfterViewInit).');
      setTimeout(() => {
        this.initializeCytoscape();
        this.subscribeToDataChanges();
      }, 0);
    } else {
      console.log('Not running in browser (SSR phase), skipping Cytoscape initialization and data subscription.');
    }
  }

  private initializeCytoscape(): void {
    console.log('Attempting to initialize Cytoscape.');
    let containerElement: HTMLDivElement | null = null;
    if (this.cyDiv && this.cyDiv.nativeElement) {
      containerElement = this.cyDiv.nativeElement;
    } else {
      console.warn('this.cyDiv.nativeElement not found, trying fallback querySelector.');
      containerElement = this.elementRef.nativeElement.querySelector('#cy');
    }

    if (!containerElement) {
      console.error("Cytoscape container div ABSOLUTELY not found!");
      return;
    }

    this.currentLayoutOptions = {
      name: 'cose',
      animate: false, // Set to false to avoid layout animation on every data change, true for initial
      padding: 30,
      fit: true,
      idealEdgeLength: (edge: any) => 100,
      nodeOverlap: 20,
      refresh: 20,
      randomize: false,
      componentSpacing: 100,
      nodeRepulsion: (node: any) => 400000,
      edgeElasticity: (edge: any) => 100,
      nestingFactor: 5,
      gravity: 80,
      numIter: 1000,
      initialTemp: 200,
      coolingFactor: 0.95,
      minTemp: 1.0
    } as LayoutOptions;

    this.cy = cytoscape({
      container: containerElement,
      elements: [], // Elements will be loaded via subscription
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
            'border-color': 'black' // Default border
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': 'blue', // Highlight color for selected node
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
            'line-color': 'blue', // Highlight color for selected edge
            'target-arrow-color': 'blue',
            'width': 4
          }
        }
      ],
      // layout: this.currentLayoutOptions, // Initial layout run is handled in subscribeToDataChanges
    });

    this.cy.on('tap', 'node, edge', (event) => {
      const tappedElement = event.target;
      this.cy.elements().not(tappedElement).unselect(); // Deselect others
      tappedElement.select(); // Select the tapped one

      this.selectedElementId = tappedElement.id();
      this.selectedElementType = tappedElement.isNode() ? 'node' : 'edge';
      console.log('Elemento seleccionado:', this.selectedElementId, tappedElement.data(), 'Type:', this.selectedElementType);
    });

    this.cy.on('tap', (event) => {
      if (event.target === this.cy) { // Tap on background
        this.selectedElementId = null;
        this.selectedElementType = null;
        this.cy.elements().unselect();
        console.log('Selección limpiada');
      }
    });

    this.cy.userZoomingEnabled(true);
    this.cy.userPanningEnabled(true);
    this.cy.boxSelectionEnabled(true);

    console.log('Cytoscape instance created.');
  }

  private subscribeToDataChanges(): void {
    if (!this.cy) {
      console.warn('Cytoscape not initialized, re-attempting subscription soon.');
      setTimeout(() => this.subscribeToDataChanges(), 100);
      return;
    }
    this.dataSubscription = combineLatest([
      this.knowledgeMapDataService.nodes$,
      this.knowledgeMapDataService.edges$
    ]).pipe(
      debounceTime(50) // Adjust as needed; helps manage frequent updates
    ).subscribe(([nodes, edges]) => {
      if (this.cy && this.currentLayoutOptions) {
        console.log('Data changed, updating Cytoscape graph.');
        const allElements = [...nodes, ...edges];

        // Preserve positions if possible (more advanced, for now, full relayout)
        // One strategy: store positions before removing, reapply after adding if ID matches.

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

        // Restore selection
        if (this.selectedElementId) {
          const elToSelect = this.cy.getElementById(this.selectedElementId);
          if (elToSelect.length > 0) {
            elToSelect.select();
          } else {
            this.selectedElementId = null; // Element no longer exists
            this.selectedElementType = null;
          }
        }
      }
    });
  }

  // --- Public methods for AppComponent to call ---
  addNewConcept(): void {
    const name = prompt("Nombre del nuevo concepto:");
    if (name) {
      // For simplicity, new nodes are added at root.
      // To add as child of selected:
      // let parentId: string | undefined = undefined;
      // if (this.selectedElementId && this.selectedElementType === 'node') {
      //   parentId = this.selectedElementId;
      // }
      // const newNodeId = this.knowledgeMapDataService.addNode(name, parentId);
      const newNodeId = this.knowledgeMapDataService.addNode(name);
      // Optionally select the new node
      // setTimeout(() => { // Allow cytoscape to update
      //   const newNodeCy = this.cy.getElementById(newNodeId);
      //   if(newNodeCy.length > 0) {
      //     this.cy.elements().unselect();
      //     newNodeCy.select();
      //     this.selectedElementId = newNodeId;
      //     this.selectedElementType = 'node';
      //   }
      // }, 100);
    }
  }

  addNewRelation(): void {
    let sourceId: string | null = null;
    let targetId: string | null = null;

    if (this.selectedElementId && this.selectedElementType === 'node') {
        sourceId = this.selectedElementId;
        targetId = prompt(`ID del nodo destino (origen es ${sourceId}):`);
    } else {
        sourceId = prompt("ID del nodo origen:");
        if (sourceId) {
            targetId = prompt("ID del nodo destino:");
        }
    }

    if (sourceId && targetId) {
      const label = prompt("Etiqueta de la relación (opcional):");
      if (label !== null) { // User didn't cancel label prompt
        const nodes = this.knowledgeMapDataService.getCurrentNodes();
        if (nodes.find(n => n.data.id === sourceId) && nodes.find(n => n.data.id === targetId)) {
          this.knowledgeMapDataService.addEdge(sourceId, targetId, label || ''); // Pass empty string if label is empty
        } else {
          alert("Uno o ambos nodos (origen o destino) no existen.");
        }
      }
    } else if (sourceId && !targetId && targetId !== null) {
        alert("Se requiere un nodo destino.");
    } else if (!sourceId && sourceId !== null){
        alert("Se requiere un nodo origen.");
    }
  }

  deleteSelected(): void {
    if (this.selectedElementId) {
      const el = this.cy.getElementById(this.selectedElementId);
      const elData = el.data();
      const elementName = elData.name || elData.label || this.selectedElementId;
      if (confirm(`¿Seguro que quieres eliminar el elemento "${elementName}"?`)) {
        this.knowledgeMapDataService.removeElement(this.selectedElementId);
        this.selectedElementId = null;
        this.selectedElementType = null;
      }
    } else {
      alert("No hay ningún elemento seleccionado.");
    }
  }

  renameSelectedElement(): void {
    if (!this.selectedElementId) {
      alert("Por favor, selecciona un elemento para renombrar.");
      return;
    }

    const element = this.cy.getElementById(this.selectedElementId);
    if (this.selectedElementType === 'node') {
      const currentName = element.data('name') || '';
      const newName = prompt("Nuevo nombre para el concepto:", currentName);
      if (newName !== null && newName !== currentName) {
        this.knowledgeMapDataService.updateNodeName(this.selectedElementId, newName);
      }
    } else if (this.selectedElementType === 'edge') {
      const currentLabel = element.data('label') || '';
      const newLabel = prompt("Nueva etiqueta para la relación:", currentLabel);
      if (newLabel !== null && newLabel !== currentLabel) {
        this.knowledgeMapDataService.updateEdgeLabel(this.selectedElementId, newLabel);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
      console.log('Data subscription unsubscribed.');
    }
    if (isPlatformBrowser(this.platformId) && this.cy) {
      this.cy.destroy();
      console.log('Cytoscape instance destroyed.');
    }
  }
}