import { Injectable } from '@angular/core';
import { ElementDefinition } from 'cytoscape';
import { BehaviorSubject, Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

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

  private nodesSubject = new BehaviorSubject<ElementDefinition[]>(this.initialNodes);
  private edgesSubject = new BehaviorSubject<ElementDefinition[]>(this.initialEdges);

  nodes$: Observable<ElementDefinition[]> = this.nodesSubject.asObservable();
  edges$: Observable<ElementDefinition[]> = this.edgesSubject.asObservable();

  constructor() { }

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
    const currentNodes = this.nodesSubject.getValue();
    const updatedNodes = currentNodes.filter(node => node.data.id !== elementId);
    if (updatedNodes.length < currentNodes.length) {
      this.nodesSubject.next(updatedNodes);
      console.log('Node removed from service:', elementId);
      this.removeEdgesConnectedToNode(elementId);
      return;
    }

    const currentEdges = this.edgesSubject.getValue();
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
      
      const updatedNodes = [
        ...currentNodes.slice(0, nodeIndex),
        updatedNode,
        ...currentNodes.slice(nodeIndex + 1)
      ];
      this.nodesSubject.next(updatedNodes);
      console.log('Node name updated in service:', nodeId, newName);
    }
  }

  updateEdgeLabel(edgeId: string, newLabel: string): void {
    const currentEdges = this.edgesSubject.getValue();
    const edgeIndex = currentEdges.findIndex(edge => edge.data.id === edgeId);
    if (edgeIndex > -1) {
      const updatedEdgeData = { ...currentEdges[edgeIndex].data, label: newLabel };
      const updatedEdge = { ...currentEdges[edgeIndex], data: updatedEdgeData };

      const updatedEdges = [
        ...currentEdges.slice(0, edgeIndex),
        updatedEdge,
        ...currentEdges.slice(edgeIndex + 1)
      ];
      this.edgesSubject.next(updatedEdges);
      console.log('Edge label updated in service:', edgeId, newLabel);
    }
  }
}