import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, Inject, PLATFORM_ID, Renderer2 } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import cytoscape, { Core, ElementDefinition, LayoutOptions } from 'cytoscape';

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

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private renderer: Renderer2,
    private elementRef: ElementRef // Inyecta ElementRef del propio componente
  ) { }

  ngOnInit(): void {
    // Lógica de OnInit si la necesitas
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      console.log('Running in browser (ngAfterViewInit).');

      const hostElement = this.elementRef.nativeElement;
      const divById = hostElement.querySelector('#cy');
      console.log('Direct querySelector for #cy from host element (in ngAfterViewInit):', divById);
      console.log('Value of this.cyDiv BEFORE setTimeout (in ngAfterViewInit):', this.cyDiv);

      console.log('Scheduling Cytoscape initialization.');
      setTimeout(() => {
        this.initializeCytoscape();
      }, 0);
    } else {
      console.log('Not running in browser (SSR phase), skipping Cytoscape initialization.');
    }
  }

  private initializeCytoscape(): void {
    console.log('Attempting to initialize Cytoscape (inside setTimeout).');
    console.log('Value of this.cyDiv at start of initializeCytoscape:', this.cyDiv);

    let containerElement: HTMLDivElement | null = null;

    if (this.cyDiv && this.cyDiv.nativeElement) {
        containerElement = this.cyDiv.nativeElement;
        console.log('Using this.cyDiv.nativeElement for Cytoscape container.');
    } else {
        console.warn('this.cyDiv is undefined or nativeElement is null. Trying direct querySelector again from component host as fallback.');
        const hostElement = this.elementRef.nativeElement; // Accede al elemento host del componente
        containerElement = hostElement.querySelector('#cy'); // Busca el div#cy dentro del host
        if (containerElement) {
            console.log('Found #cy using direct querySelector inside initializeCytoscape (fallback):', containerElement);
        }
    }

    if (!containerElement) {
      console.error("Cytoscape container div ABSOLUTELY not found! Cannot initialize Cytoscape.");
      return;
    }
    console.log('Using containerElement for Cytoscape:', containerElement);

    const elements: ElementDefinition[] = [
      { data: { id: 'a', name: 'Concepto A' } },
      { data: { id: 'b', name: 'Concepto B' } },
      { data: { id: 'c', name: 'Abstracción C (Padre)' } },
      { data: { id: 'c1', name: 'Sub-concepto C1', parent: 'c' } },
      { data: { id: 'd', name: 'Entidad D' } },
    ];

    const edges: ElementDefinition[] = [
      { data: { id: 'ab', source: 'a', target: 'b', label: 'Relacionado con' } },
      { data: { id: 'ac', source: 'a', target: 'c', label: 'Parte de' } },
      { data: { id: 'bc1', source: 'b', target: 'c1', label: 'Influye en' } },
      { data: { id: 'cd', source: 'c', target: 'd', label: 'Conecta a' } },
    ];

    try {
      this.cy = cytoscape({
        container: containerElement,
        elements: [...elements, ...edges],
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
              'shape': 'round-rectangle'
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
          }
        ],
        layout: {
          name: 'cose',
          animate: true,
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
        } as LayoutOptions
      });

      this.cy.on('tap', 'node', (event) => {
        const tappedNode = event.target;
        console.log('Nodo clickeado:', tappedNode.id(), tappedNode.data('name'));
      });

      this.cy.on('tap', 'edge', (event) => {
        const tappedEdge = event.target;
        console.log('Arista clickeada:', tappedEdge.id(), tappedEdge.data('label'));
      });

      this.cy.userZoomingEnabled(true);
      this.cy.userPanningEnabled(true);
      this.cy.boxSelectionEnabled(true);

      console.log('Cytoscape instance created successfully.');
    } catch (error) {
        console.error('Error initializing Cytoscape:', error);
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId) && this.cy) {
      this.cy.destroy();
      console.log('Cytoscape destruido en el navegador.');
    }
  }
}