import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, Inject, PLATFORM_ID, Renderer2 } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import cytoscape, { Core, ElementDefinition, LayoutOptions, NodeSingular, EdgeSingular, EdgeCollection } from 'cytoscape';
import edgehandles from 'cytoscape-edgehandles';
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
  private eh: any; // Variable to hold the edgehandles instance
  private dataSubscription!: Subscription;
  private currentLayoutOptions!: LayoutOptions;

  selectedElementId: string | null = null;
  selectedElementType: 'node' | 'edge' | null = null;
  public isEdgeDrawingEnabled: boolean = true; // Initialized to true as edgehandles is enabled by default

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private renderer: Renderer2,
    private elementRef: ElementRef,
    public knowledgeMapDataService: KnowledgeMapDataService
  ) { }

  ngOnInit(): void {
    // Initialization and subscription happen in ngAfterViewInit for browser environment
    if (isPlatformBrowser(this.platformId)) {
      // Register edgehandles extension
      // It's important to do this before Cytoscape instance is created if possible,
      // or at least before it's used by the extension.
      // Doing it in ngOnInit or even earlier (e.g., in constructor or as a static block) is fine.
      cytoscape.use(edgehandles);
      console.log('Cytoscape edgehandles extension registered.');
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      console.log('Running in browser (ngAfterViewInit).');
      setTimeout(() => {
        this.initializeCytoscape();
        this.subscribeToDataChanges();
        this.initializeEdgeHandles(); // Initialize edgehandles after Cytoscape
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
      idealEdgeLength: (edge: any) => 100, // Maintained default, good balance
      nodeOverlap: 20, // Default, generally fine
      refresh: 20, // Default
      randomize: false, // Default, good for consistent layouts
      componentSpacing: 100, // Default, spaces out disconnected components
      nodeRepulsion: (node: any) => 450000, // Slightly increased for more space
      edgeElasticity: (edge: any) => 120, // Slightly increased for more defined edge lengths
      nestingFactor: 3, // Reduced for slightly less tight child packing
      gravity: 90, // Slightly increased to keep graph centered
      numIter: 1000, // Default
      initialTemp: 200, // Default
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
            'background-color': 'data(backgroundColor)',
            'label': 'data(name)',
            'width': 'data(width)',
            'height': 'data(height)',
            'padding': 'data(padding)', 
            'text-valign': 'center',
            'text-halign': 'center',
            'shape': 'data(shape)',
            'border-width': 'data(borderWidth)',
            'border-color': 'data(borderColor)',
            'text-outline-width': 1, // Added for label readability
            'text-outline-color': '#fff' // Added for label readability
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
          selector: 'node[parent]', // This will still apply if parent-specific values are in data
          style: { // These will be overridden by data() if specific data fields exist
                     // or act as defaults if data fields are not set for a particular parent.
            'background-opacity': 0.333, // Keep this if it's a specific visual treatment not in data
            // 'background-color': '#2773b2', // Controlled by data(backgroundColor)
            // 'border-color': '#1a5a93',   // Controlled by data(borderColor)
            'text-valign': 'top', // Parent-specific label alignment
            // 'padding': '20px' // Controlled by data(padding)
            // label, border-width, shape are already data-driven
          }
        },
        {
          selector: 'node[?collapsed]', // This selector is for state, not base style from data
          style: {
            'background-color': '#a3a3a3', // Adjusted color
            'border-color': '#707070',   // Adjusted color
            'shape': 'diamond',
            'label': (ele: NodeSingular) => ele.data('name') + ' (+)', // Appended (+) for collapsed
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 'data(edgeWidth)',
            'line-color': 'data(lineColor)',
            'target-arrow-color': 'data(lineColor)', // Typically same as line color
            'target-arrow-shape': 'data(arrowShape)',
            'curve-style': 'data(curveStyle)',
            'label': 'data(label)',
            'font-size': '10px', // Keep or make data-driven if needed
            'text-rotation': 'autorotate',
            'text-margin-y': -10 // Keep or make data-driven if needed
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

      if (tappedElement.isNode() && tappedElement.isParent()) {
        const isCollapsed = tappedElement.data('collapsed');
        tappedElement.data('collapsed', !isCollapsed); // Toggle state

        if (!isCollapsed) { // Is now collapsed
          // Is now collapsed
          const childrenOfTapped = tappedElement.children();
          childrenOfTapped.forEach((child: NodeSingular) => {
            child.style('display', 'none');
            // Hide all edges connected to this child, regardless of the other end
            child.connectedEdges().style('display', 'none');
          });
          tappedElement.addClass('collapsed-parent');
          // Update selector for styling
          tappedElement.data('collapsed', true);
        } else { // Is now expanded
          const childrenOfTapped = tappedElement.children();
          childrenOfTapped.forEach((child: NodeSingular) => {
            child.style('display', 'element');
          });

          // After making all children visible, then make their relevant edges visible
          childrenOfTapped.forEach((child: NodeSingular) => {
            child.connectedEdges().forEach((edge: EdgeSingular) => {
              // An edge is visible if both its source and target nodes are visible
              if (edge.source().visible() && edge.target().visible()) {
                edge.style('display', 'element');
              }
            });
          });
          tappedElement.removeClass('collapsed-parent');
          // Update selector for styling
          tappedElement.data('collapsed', false);
        }
        // Re-run layout after expand/collapse
        // Debounce this if it causes performance issues on large graphs
        if (this.cy && this.currentLayoutOptions) {
            const layout = this.cy.layout(this.currentLayoutOptions);
            if (layout && typeof layout.run === 'function') {
                layout.run();
            }
        }
      } else {
        // Default behavior for non-parent nodes and edges
        this.cy.elements().not(tappedElement).unselect(); // Deselect others
        tappedElement.select(); // Select the tapped one

        this.selectedElementId = tappedElement.id();
        this.selectedElementType = tappedElement.isNode() ? 'node' : 'edge';
        console.log('Elemento seleccionado:', this.selectedElementId, tappedElement.data(), 'Type:', this.selectedElementType);
      }
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

  private initializeEdgeHandles(): void {
    if (!this.cy) {
      console.error('Cytoscape instance (this.cy) not available for edgehandles initialization.');
      return;
    }
    const options = {
      complete: (sourceNode: NodeSingular, targetNode: NodeSingular, addedEles: EdgeCollection) => {
        // Log to console for now
        console.log('Edge drawn from', sourceNode.id(), 'to', targetNode.id());
        
        // Prompt for label
        const label = prompt(`Enter label for edge from "${sourceNode.data('name') || sourceNode.id()}" to "${targetNode.data('name') || targetNode.id()}":`);
        
        if (label !== null) { // User didn't cancel prompt
          this.knowledgeMapDataService.addEdge(sourceNode.id(), targetNode.id(), label);
        }
        
        // Remove the preview edge added by edgehandles, as we will add the actual edge via the service
        // This ensures data consistency and leverages the existing data service logic (including undo/redo)
        addedEles.remove(); 
        console.log('Preview edge removed, actual edge will be added via data service.');
      },
      // You can add other options here as needed, e.g.,
      // snap: true, // Snap to node
      // preview: true, // Show a preview edge
      // hoveroverNode: (node) => { /* Custom logic */ },
      // handleNodes: 'node', // Selector for nodes that can start an edge
      // handlePosition: 'middle middle', // Position of the handle on the node
      // edgeType: (sourceNode, targetNode) => { return 'flat'; /* or 'node' or 'flat' or 'loop' */ }
    };

    this.eh = this.cy.edgehandles(options);
    // Set initial state based on whether draw mode is enabled by default
    if (this.isEdgeDrawingEnabled) {
      this.eh.enableDrawMode();
      console.log('Cytoscape edgehandles initialized and draw mode enabled.');
    } else {
      this.eh.disableDrawMode();
      console.log('Cytoscape edgehandles initialized and draw mode disabled.');
    }
    // To destroy: this.eh.destroy();
  }

  public toggleEdgeDrawingMode(): void {
    this.isEdgeDrawingEnabled = !this.isEdgeDrawingEnabled;
    if (this.eh) {
      if (this.isEdgeDrawingEnabled) {
        this.eh.enableDrawMode();
        console.log('Edge drawing mode enabled.');
      } else {
        this.eh.disableDrawMode();
        console.log('Edge drawing mode disabled.');
      }
    } else {
      console.warn('Edgehandles instance (this.eh) not available to toggle mode.');
    }
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

    // Initialize parent nodes: set `collapsed` to false (expanded) by default
    this.cy.nodes().filter((node: NodeSingular) => node.isParent()).forEach((parentNode: NodeSingular) => {
      parentNode.data('collapsed', false); // Start expanded
      // Ensure children are visible initially if parent is expanded
      // This should be default Cytoscape behavior unless styled otherwise
      parentNode.children().forEach((child: NodeSingular) => {
        child.style('display', 'element');
        child.connectedEdges().style('display', 'element');
      });
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

        // After layout, re-apply collapsed state styling and children visibility
        // This is important if data is reloaded (e.g. new node/edge added)
        this.cy.nodes().filter((node: NodeSingular) => node.isParent()).forEach((parentNode: NodeSingular) => {
          const isCollapsed = parentNode.data('collapsed'); // Get the stored state
          if (isCollapsed) {
            const childrenOfParent = parentNode.children();
            childrenOfParent.forEach((child: NodeSingular) => {
              child.style('display', 'none');
              child.connectedEdges().style('display', 'none');
            });
            parentNode.addClass('collapsed-parent');
            // parentNode.data('collapsed', true); // Ensure data matches, though it should
          } else {
            const childrenOfParent = parentNode.children();
            childrenOfParent.forEach((child: NodeSingular) => {
              child.style('display', 'element');
            });
            // After making all children visible, then make their relevant edges visible
            childrenOfParent.forEach((child: NodeSingular) => {
              child.connectedEdges().forEach((edge: EdgeSingular) => {
                if (edge.source().visible() && edge.target().visible()) {
                  edge.style('display', 'element');
                }
              });
            });
            parentNode.removeClass('collapsed-parent');
            // parentNode.data('collapsed', false); // Ensure data matches
          }
        });

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