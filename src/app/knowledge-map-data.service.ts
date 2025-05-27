import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ElementDefinition } from 'cytoscape';
import { BehaviorSubject, Observable, combineLatest, Subscription } from 'rxjs';
import { debounceTime, skip } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

const LOCAL_STORAGE_NODES_KEY = 'knowledgeMapNodes';
const LOCAL_STORAGE_EDGES_KEY = 'knowledgeMapEdges';

export type EdgeDirection = 'source-to-target' | 'target-to-source' | 'both' | 'none';

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
    { data: { id: 'ab', source: 'a', target: 'b', label: 'Relacionado con', direction: 'source-to-target' } },
    { data: { id: 'ac', source: 'a', target: 'c', label: 'Parte de', direction: 'source-to-target' } },
    { data: { id: 'bc1', source: 'b', target: 'c1', label: 'Influye en', direction: 'both' } },
    { data: { id: 'cd', source: 'c', target: 'd', label: 'Conecta a', direction: 'none' } },
  ];

  private nodesSubject: BehaviorSubject<ElementDefinition[]>;
  private edgesSubject: BehaviorSubject<ElementDefinition[]>;
  private persistenceSubscription: Subscription | undefined;

  nodes$: Observable<ElementDefinition[]>;
  edges$: Observable<ElementDefinition[]>;

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
          storedEdges.forEach(edge => {
            // Use bracket notation for accessing 'direction'
            if (edge.data && edge.data['direction'] === undefined) {
              edge.data['direction'] = 'source-to-target';
            }
          });
        } else {
           this.initialEdges.forEach(edge => {
             if (edge.data && edge.data['direction'] === undefined) {
               edge.data['direction'] = 'source-to-target';
             }
           });
           storedEdges = this.initialEdges;
        }

      } catch (e) {
        console.error('Error loading data from localStorage', e);
        this.initialEdges.forEach(edge => {
          if (edge.data && edge.data['direction'] === undefined) {
            edge.data['direction'] = 'source-to-target';
          }
        });
        storedEdges = this.initialEdges;
      }
    } else {
        this.initialEdges.forEach(edge => {
          if (edge.data && edge.data['direction'] === undefined) {
            edge.data['direction'] = 'source-to-target';
          }
        });
        storedEdges = this.initialEdges;
    }


    this.nodesSubject = new BehaviorSubject<ElementDefinition[]>(storedNodes);
    this.edgesSubject = new BehaviorSubject<ElementDefinition[]>(storedEdges);

    this.nodes$ = this.nodesSubject.asObservable();
    this.edges$ = this.edgesSubject.asObservable();

    this.setupPersistence();
  }

  private setupPersistence(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.persistenceSubscription = combineLatest([
        this.nodes$.pipe(skip(1)),
        this.edges$.pipe(skip(1))
      ]).pipe(
        debounceTime(500)
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
    const newNodeData: { id: string; name: string; parent?: string } = {
      id: newNodeId,
      name: name
    };
    if (parentId) {
      newNodeData.parent = parentId;
    }
    const newNode: ElementDefinition = { data: newNodeData };

    const currentNodes = this.nodesSubject.getValue();
    this.nodesSubject.next([...currentNodes, newNode]);
    console.log('Node added to service:', newNode);
    return newNodeId;
  }

  addEdge(sourceId: string, targetId: string, label: string, direction: EdgeDirection = 'source-to-target'): string {
    const newEdgeId = uuidv4();
    const newEdgeData: { id: string; source: string; target: string; label: string; direction: EdgeDirection } = {
      id: newEdgeId,
      source: sourceId,
      target: targetId,
      label: label,
      direction: direction // Use bracket notation for assignment if it were an index signature, but here it's a defined property
    };
    const newEdge: ElementDefinition = { data: newEdgeData };

    const currentEdges = this.edgesSubject.getValue();
    this.edgesSubject.next([...currentEdges, newEdge]);
    console.log('Edge added to service:', newEdge);
    return newEdgeId;
  }

  removeElement(elementId: string): void {
    let currentNodes = this.nodesSubject.getValue();
    // Ensure data.id is accessed correctly
    const updatedNodes = currentNodes.filter(node => node.data && node.data['id'] !== elementId);
    if (updatedNodes.length < currentNodes.length) {
      this.nodesSubject.next(updatedNodes);
      console.log('Node removed from service:', elementId);
      this.removeEdgesConnectedToNode(elementId);
      return;
    }

    let currentEdges = this.edgesSubject.getValue();
    // Ensure data.id is accessed correctly
    const updatedEdges = currentEdges.filter(edge => edge.data && edge.data['id'] !== elementId);
    if (updatedEdges.length < currentEdges.length) {
      this.edgesSubject.next(updatedEdges);
      console.log('Edge removed from service:', elementId);
    }
  }

  private removeEdgesConnectedToNode(nodeId: string): void {
    const currentEdges = this.edgesSubject.getValue();
    // Use bracket notation for source and target
    const updatedEdges = currentEdges.filter(edge => edge.data && edge.data['source'] !== nodeId && edge.data['target'] !== nodeId);
    if (updatedEdges.length < currentEdges.length) {
        this.edgesSubject.next(updatedEdges);
        console.log('Edges connected to node removed from service:', nodeId);
    }
  }

  updateNodeName(nodeId: string, newName: string): void {
    const currentNodes = this.nodesSubject.getValue();
    // Ensure data.id is accessed correctly
    const nodeIndex = currentNodes.findIndex(node => node.data && node.data['id'] === nodeId);
    if (nodeIndex > -1) {
      // Ensure data.name is accessed/assigned correctly
      const updatedNodeData = { ...currentNodes[nodeIndex].data, name: newName };
      const updatedNode = { ...currentNodes[nodeIndex], data: updatedNodeData };

      const updatedNodesArray = [
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
    // Ensure data.id is accessed correctly
    const edgeIndex = currentEdges.findIndex(edge => edge.data && edge.data['id'] === edgeId);
    if (edgeIndex > -1) {
      // Ensure data.label is accessed/assigned correctly, and spread other properties
      const updatedEdgeData = { ...currentEdges[edgeIndex].data, label: newLabel };
      const updatedEdge = { ...currentEdges[edgeIndex], data: updatedEdgeData };

      const updatedEdgesArray = [
        ...currentEdges.slice(0, edgeIndex),
        updatedEdge,
        ...currentEdges.slice(edgeIndex + 1)
      ];
      this.edgesSubject.next(updatedEdgesArray);
      console.log('Edge label updated in service:', edgeId, newLabel);
    }
  }

  updateEdgeDirection(edgeId: string, newDirection: EdgeDirection): void {
    const currentEdges = this.edgesSubject.getValue();
    // Ensure data.id is accessed correctly
    const edgeIndex = currentEdges.findIndex(edge => edge.data && edge.data['id'] === edgeId);
    if (edgeIndex > -1) {
      // Spread existing data and update direction using bracket notation for assignment to the data object
      const updatedEdgeData = { ...currentEdges[edgeIndex].data, ['direction']: newDirection };
      const updatedEdge = { ...currentEdges[edgeIndex], data: updatedEdgeData };

      const updatedEdgesArray = [
        ...currentEdges.slice(0, edgeIndex),
        updatedEdge,
        ...currentEdges.slice(edgeIndex + 1)
      ];
      this.edgesSubject.next(updatedEdgesArray);
      console.log('Edge direction updated in service:', edgeId, newDirection);
    }
  }

  // ngOnDestroy() {
  //   if (this.persistenceSubscription) {
  //     this.persistenceSubscription.unsubscribe();
  //   }
  // }
}