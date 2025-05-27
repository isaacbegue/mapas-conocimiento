import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ElementDefinition } from 'cytoscape';
import { BehaviorSubject, Observable, combineLatest, Subscription } from 'rxjs';
import { debounceTime, skip } from 'rxjs/operators'; // Importar skip y debounceTime
import { v4 as uuidv4 } from 'uuid';

const LOCAL_STORAGE_NODES_KEY = 'knowledgeMapNodes';
const LOCAL_STORAGE_EDGES_KEY = 'knowledgeMapEdges';

@Injectable({
  providedIn: 'root'
})
export class KnowledgeMapDataService {

  private initialNodes: ElementDefinition[] = [
    { data: { id: 'a', name: 'Concepto A' } },
    { data: { id: 'b', name: 'Concepto B' } },
    { data: { id: 'c', name: 'Abstracción C (Padre)' } },
    { data: { id: 'c1', name: 'Sub-concepto C1', parent: 'c' } },
    { data: { id: 'd', name: 'Entidad D' } },
  ];

  private initialEdges: ElementDefinition[] = [
    { data: { id: 'ab', source: 'a', target: 'b', label: 'Relacionado con' } },
    { data: { id: 'ac', source: 'a', target: 'c', label: 'Parte de' } },
    { data: { id: 'bc1', source: 'b', target: 'c1', label: 'Influye en' } },
    { data: { id: 'cd', source: 'c', target: 'd', label: 'Conecta a' } },
  ];

  private nodesSubject: BehaviorSubject<ElementDefinition[]>;
  private edgesSubject: BehaviorSubject<ElementDefinition[]>;
  private persistenceSubscription: Subscription | undefined;


  nodes$: Observable<ElementDefinition[]> = new Observable<ElementDefinition[]>(); // Inicialización placeholder
  edges$: Observable<ElementDefinition[]> = new Observable<ElementDefinition[]>(); // Inicialización placeholder

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    let storedNodes: ElementDefinition[] = this.initialNodes;
    let storedEdges: ElementDefinition[] = this.initialEdges;

    if (isPlatformBrowser(this.platformId)) {
      try {
        const nodesJson = localStorage.getItem(LOCAL_STORAGE_NODES_KEY);
        if (nodesJson) {
          storedNodes = JSON.parse(nodesJson);
        }
        const edgesJson = localStorage.getItem(LOCAL_STORAGE_EDGES_KEY);
        if (edgesJson) {
          storedEdges = JSON.parse(edgesJson);
        }
      } catch (e) {
        console.error('Error loading data from localStorage', e);
        // Se usarán los datos iniciales por defecto
      }
    }

    this.nodesSubject = new BehaviorSubject<ElementDefinition[]>(storedNodes);
    this.edgesSubject = new BehaviorSubject<ElementDefinition[]>(storedEdges);

    this.nodes$ = this.nodesSubject.asObservable();
    this.edges$ = this.edgesSubject.asObservable();

    this.setupPersistence();
  }

  private setupPersistence(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Usamos combineLatest para reaccionar a cambios en nodos o aristas
      // skip(1) para evitar guardar el estado inicial que acabamos de cargar o definir
      // debounceTime para no guardar en cada micro-cambio, sino agruparlos.
      this.persistenceSubscription = combineLatest([
        this.nodes$.pipe(skip(1)), // Skip el valor inicial al cargar
        this.edges$.pipe(skip(1))  // Skip el valor inicial al cargar
      ]).pipe(
        debounceTime(500) // Espera 500ms después del último cambio antes de guardar
      ).subscribe(([nodes, edges]) => {
        try {
          console.log('Saving to localStorage...');
          localStorage.setItem(LOCAL_STORAGE_NODES_KEY, JSON.stringify(nodes));
          localStorage.setItem(LOCAL_STORAGE_EDGES_KEY, JSON.stringify(edges));
        } catch (e) {
          console.error('Error saving data to localStorage', e);
        }
      });
    }
  }


  getCurrentNodes(): ElementDefinition[] {
    return this.nodesSubject.getValue();
  }

  getCurrentEdges(): ElementDefinition[] {
    return this.edgesSubject.getValue();
  }

  addNode(name: string, parentId?: string): string {
    const newNodeId = uuidv4();
    const newNode: ElementDefinition = {
      data: {
        id: newNodeId,
        name: name
      }
    };
    if (parentId) {
      newNode.data.parent = parentId;
    }
    const currentNodes = this.nodesSubject.getValue();
    this.nodesSubject.next([...currentNodes, newNode]);
    console.log('Node added to service:', newNode);
    return newNodeId;
  }

  addEdge(sourceId: string, targetId: string, label: string): string {
    const newEdgeId = uuidv4();
    const newEdge: ElementDefinition = {
      data: {
        id: newEdgeId,
        source: sourceId,
        target: targetId,
        label: label
      }
    };
    const currentEdges = this.edgesSubject.getValue();
    this.edgesSubject.next([...currentEdges, newEdge]);
    console.log('Edge added to service:', newEdge);
    return newEdgeId;
  }

  removeElement(elementId: string): void {
    let currentNodes = this.nodesSubject.getValue();
    const updatedNodes = currentNodes.filter(node => node.data.id !== elementId);
    if (updatedNodes.length < currentNodes.length) {
      this.nodesSubject.next(updatedNodes);
      console.log('Node removed from service:', elementId);
      this.removeEdgesConnectedToNode(elementId);
      return;
    }

    let currentEdges = this.edgesSubject.getValue();
    const updatedEdges = currentEdges.filter(edge => edge.data.id !== elementId);
    if (updatedEdges.length < currentEdges.length) {
      this.edgesSubject.next(updatedEdges);
      console.log('Edge removed from service:', elementId);
    }
  }

  private removeEdgesConnectedToNode(nodeId: string): void {
    const currentEdges = this.edgesSubject.getValue();
    const updatedEdges = currentEdges.filter(edge => edge.data.source !== nodeId && edge.data.target !== nodeId);
    if (updatedEdges.length < currentEdges.length) {
        this.edgesSubject.next(updatedEdges);
        console.log('Edges connected to node removed from service:', nodeId);
    }
  }

  updateNodeName(nodeId: string, newName: string): void {
    const currentNodes = this.nodesSubject.getValue();
    const nodeIndex = currentNodes.findIndex(node => node.data.id === nodeId);
    if (nodeIndex > -1) {
      const updatedNodeData = { ...currentNodes[nodeIndex].data, name: newName };
      const updatedNode = { ...currentNodes[nodeIndex], data: updatedNodeData };
      
      const updatedNodesArray = [ // Renombrado para evitar conflicto de nombres
        ...currentNodes.slice(0, nodeIndex),
        updatedNode,
        ...currentNodes.slice(nodeIndex + 1)
      ];
      this.nodesSubject.next(updatedNodesArray);
      console.log('Node name updated in service:', nodeId, newName);
    }
  }

  updateEdgeLabel(edgeId: string, newLabel: string): void {
    const currentEdges = this.edgesSubject.getValue();
    const edgeIndex = currentEdges.findIndex(edge => edge.data.id === edgeId);
    if (edgeIndex > -1) {
      const updatedEdgeData = { ...currentEdges[edgeIndex].data, label: newLabel };
      const updatedEdge = { ...currentEdges[edgeIndex], data: updatedEdgeData };

      const updatedEdgesArray = [ // Renombrado para evitar conflicto de nombres
        ...currentEdges.slice(0, edgeIndex),
        updatedEdge,
        ...currentEdges.slice(edgeIndex + 1)
      ];
      this.edgesSubject.next(updatedEdgesArray);
      console.log('Edge label updated in service:', edgeId, newLabel);
    }
  }

  // No olvides limpiar la suscripción cuando el servicio se destruya (aunque como 'root' provided, vive con la app)
  // ngOnDestroy() {
  //   if (this.persistenceSubscription) {
  //     this.persistenceSubscription.unsubscribe();
  //   }
  // }
}