import { Injectable } from '@angular/core';
import { ElementDefinition } from 'cytoscape';
import { BehaviorSubject, Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root'
})
export class KnowledgeMapDataService {

  // Default Style Constants
  private readonly DEFAULT_NODE_BACKGROUND_COLOR = '#666';
  private readonly DEFAULT_NODE_SHAPE = 'round-rectangle';
  private readonly DEFAULT_NODE_BORDER_COLOR = '#000';
  private readonly DEFAULT_NODE_BORDER_WIDTH = 2;
  private readonly DEFAULT_NODE_WIDTH = 'label';
  private readonly DEFAULT_NODE_HEIGHT = 'label';
  private readonly DEFAULT_NODE_PADDING = '10px'; // Added for consistency with existing styles

  private readonly DEFAULT_EDGE_LINE_COLOR = '#ccc';
  private readonly DEFAULT_EDGE_ARROW_SHAPE = 'triangle';
  private readonly DEFAULT_EDGE_WIDTH = 3;
  private readonly DEFAULT_EDGE_CURVE_STYLE = 'bezier'; // Added for consistency

  private initialNodes: ElementDefinition[] = [
    { data: { 
        id: 'a', name: 'Concepto A', 
        backgroundColor: this.DEFAULT_NODE_BACKGROUND_COLOR, shape: this.DEFAULT_NODE_SHAPE, 
        borderColor: this.DEFAULT_NODE_BORDER_COLOR, borderWidth: this.DEFAULT_NODE_BORDER_WIDTH,
        width: this.DEFAULT_NODE_WIDTH, height: this.DEFAULT_NODE_HEIGHT, padding: this.DEFAULT_NODE_PADDING
    } },
    { data: { 
        id: 'b', name: 'Concepto B',
        backgroundColor: this.DEFAULT_NODE_BACKGROUND_COLOR, shape: this.DEFAULT_NODE_SHAPE,
        borderColor: this.DEFAULT_NODE_BORDER_COLOR, borderWidth: this.DEFAULT_NODE_BORDER_WIDTH,
        width: this.DEFAULT_NODE_WIDTH, height: this.DEFAULT_NODE_HEIGHT, padding: this.DEFAULT_NODE_PADDING
    } },
    { data: { 
        id: 'c', name: 'Abstracción C (Padre)',
        // Parent nodes have specific styles in graph-canvas, these might be overridden or augmented
        backgroundColor: '#2773b2', // Example different color for parent from existing styles
        shape: this.DEFAULT_NODE_SHAPE,
        borderColor: '#1a5a93', // Example different border for parent
        borderWidth: this.DEFAULT_NODE_BORDER_WIDTH,
        width: this.DEFAULT_NODE_WIDTH, height: this.DEFAULT_NODE_HEIGHT, padding: '20px' // Larger padding for parents
    } },
    { data: { 
        id: 'c1', name: 'Sub-concepto C1', parent: 'c',
        backgroundColor: this.DEFAULT_NODE_BACKGROUND_COLOR, shape: this.DEFAULT_NODE_SHAPE,
        borderColor: this.DEFAULT_NODE_BORDER_COLOR, borderWidth: this.DEFAULT_NODE_BORDER_WIDTH,
        width: this.DEFAULT_NODE_WIDTH, height: this.DEFAULT_NODE_HEIGHT, padding: this.DEFAULT_NODE_PADDING
    } },
    { data: { 
        id: 'd', name: 'Entidad D',
        backgroundColor: this.DEFAULT_NODE_BACKGROUND_COLOR, shape: this.DEFAULT_NODE_SHAPE,
        borderColor: this.DEFAULT_NODE_BORDER_COLOR, borderWidth: this.DEFAULT_NODE_BORDER_WIDTH,
        width: this.DEFAULT_NODE_WIDTH, height: this.DEFAULT_NODE_HEIGHT, padding: this.DEFAULT_NODE_PADDING
    } },
  ];

  private initialEdges: ElementDefinition[] = [
    { data: { 
        id: 'ab', source: 'a', target: 'b', label: 'Relacionado con',
        lineColor: this.DEFAULT_EDGE_LINE_COLOR, arrowShape: this.DEFAULT_EDGE_ARROW_SHAPE,
        edgeWidth: this.DEFAULT_EDGE_WIDTH, curveStyle: this.DEFAULT_EDGE_CURVE_STYLE
    } },
    { data: { 
        id: 'ac', source: 'a', target: 'c', label: 'Parte de',
        lineColor: this.DEFAULT_EDGE_LINE_COLOR, arrowShape: this.DEFAULT_EDGE_ARROW_SHAPE,
        edgeWidth: this.DEFAULT_EDGE_WIDTH, curveStyle: this.DEFAULT_EDGE_CURVE_STYLE
    } },
    { data: { 
        id: 'bc1', source: 'b', target: 'c1', label: 'Influye en',
        lineColor: this.DEFAULT_EDGE_LINE_COLOR, arrowShape: this.DEFAULT_EDGE_ARROW_SHAPE,
        edgeWidth: this.DEFAULT_EDGE_WIDTH, curveStyle: this.DEFAULT_EDGE_CURVE_STYLE
    } },
    { data: { 
        id: 'cd', source: 'c', target: 'd', label: 'Conecta a',
        lineColor: this.DEFAULT_EDGE_LINE_COLOR, arrowShape: this.DEFAULT_EDGE_ARROW_SHAPE,
        edgeWidth: this.DEFAULT_EDGE_WIDTH, curveStyle: this.DEFAULT_EDGE_CURVE_STYLE
    } },
  ];

  private nodesSubject = new BehaviorSubject<ElementDefinition[]>(JSON.parse(JSON.stringify(this.initialNodes)));
  private edgesSubject = new BehaviorSubject<ElementDefinition[]>(JSON.parse(JSON.stringify(this.initialEdges)));

  nodes$: Observable<ElementDefinition[]> = this.nodesSubject.asObservable();
  edges$: Observable<ElementDefinition[]> = this.edgesSubject.asObservable();

  private history: { nodes: ElementDefinition[], edges: ElementDefinition[] }[] = [];
  private historyPointer: number = -1;
  private readonly MAX_HISTORY_SIZE = 100; // Optional: Limit history size

  constructor() {
    // Save the initial state
    this.saveState(this.nodesSubject.getValue(), this.edgesSubject.getValue());
  }

  private saveState(nodes: ElementDefinition[], edges: ElementDefinition[]): void {
    // Clear any "future" states if historyPointer is not at the end
    if (this.historyPointer < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyPointer + 1);
    }

    // Optional: Enforce maximum history size
    if (this.history.length >= this.MAX_HISTORY_SIZE) {
      this.history.shift(); // Remove the oldest state
      this.historyPointer--; // Adjust pointer accordingly
    }

    // Deep copy of node and edge data to prevent mutations
    const newNodes = nodes.map(n => ({ ...n, data: { ...n.data } }));
    const newEdges = edges.map(e => ({ ...e, data: { ...e.data } }));

    this.history.push({ nodes: newNodes, edges: newEdges });
    this.historyPointer++;
    console.log('State saved. History size:', this.history.length, 'Pointer:', this.historyPointer);
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
        name: name,
        backgroundColor: this.DEFAULT_NODE_BACKGROUND_COLOR,
        shape: this.DEFAULT_NODE_SHAPE,
        borderColor: this.DEFAULT_NODE_BORDER_COLOR,
        borderWidth: this.DEFAULT_NODE_BORDER_WIDTH,
        width: this.DEFAULT_NODE_WIDTH,
        height: this.DEFAULT_NODE_HEIGHT,
        padding: this.DEFAULT_NODE_PADDING
      }
    };
    if (parentId) {
      newNode.data.parent = parentId;
      // Potentially different default styles for children, or handled by parent style in Cytoscape
    }
    const currentNodes = this.nodesSubject.getValue();
    this.nodesSubject.next([...currentNodes, newNode]);
    this.saveState(this.nodesSubject.getValue(), this.edgesSubject.getValue());
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
        label: label,
        lineColor: this.DEFAULT_EDGE_LINE_COLOR,
        arrowShape: this.DEFAULT_EDGE_ARROW_SHAPE,
        edgeWidth: this.DEFAULT_EDGE_WIDTH,
        curveStyle: this.DEFAULT_EDGE_CURVE_STYLE
      }
    };
    const currentEdges = this.edgesSubject.getValue();
    this.edgesSubject.next([...currentEdges, newEdge]);
    this.saveState(this.nodesSubject.getValue(), this.edgesSubject.getValue());
    console.log('Edge added to service:', newEdge);
    return newEdgeId;
  }

  removeElement(elementId: string): void {
    const currentNodes = this.nodesSubject.getValue();
    const updatedNodes = currentNodes.filter(node => node.data.id !== elementId);
    if (updatedNodes.length < currentNodes.length) {
      this.nodesSubject.next(updatedNodes);
      this.removeEdgesConnectedToNode(elementId, false); // Pass false to avoid double saveState
      this.saveState(this.nodesSubject.getValue(), this.edgesSubject.getValue());
      console.log('Node removed from service:', elementId);
      return;
    }

    const currentEdges = this.edgesSubject.getValue();
    const updatedEdges = currentEdges.filter(edge => edge.data.id !== elementId);
    if (updatedEdges.length < currentEdges.length) {
      this.edgesSubject.next(updatedEdges);
      this.saveState(this.nodesSubject.getValue(), this.edgesSubject.getValue());
      console.log('Edge removed from service:', elementId);
    }
  }

  // Added shouldSaveState parameter to avoid double-saving when called from removeElement
  private removeEdgesConnectedToNode(nodeId: string, shouldSaveState: boolean = true): void {
    const currentEdges = this.edgesSubject.getValue();
    const updatedEdges = currentEdges.filter(edge => edge.data.source !== nodeId && edge.data.target !== nodeId);
    if (updatedEdges.length < currentEdges.length) {
        this.edgesSubject.next(updatedEdges);
        if (shouldSaveState) {
            this.saveState(this.nodesSubject.getValue(), this.edgesSubject.getValue());
        }
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
      this.saveState(this.nodesSubject.getValue(), this.edgesSubject.getValue());
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
      this.saveState(this.nodesSubject.getValue(), this.edgesSubject.getValue());
      console.log('Edge label updated in service:', edgeId, newLabel);
    }
  }

  // --- Undo/Redo Functionality ---

  canUndo(): boolean {
    return this.historyPointer > 0;
  }

  canRedo(): boolean {
    return this.historyPointer < this.history.length - 1;
  }

  undo(): void {
    if (this.canUndo()) {
      this.historyPointer--;
      const previousState = this.history[this.historyPointer];
      // Deep copy from history to prevent accidental modification of history state
      const nodesToRestore = previousState.nodes.map(n => ({ ...n, data: { ...n.data } }));
      const edgesToRestore = previousState.edges.map(e => ({ ...e, data: { ...e.data } }));
      
      this.nodesSubject.next(nodesToRestore);
      this.edgesSubject.next(edgesToRestore);
      console.log('Undo performed. Pointer:', this.historyPointer);
    } else {
      console.log('Cannot undo. At oldest state.');
    }
  }

  redo(): void {
    if (this.canRedo()) {
      this.historyPointer++;
      const nextState = this.history[this.historyPointer];
      // Deep copy from history
      const nodesToRestore = nextState.nodes.map(n => ({ ...n, data: { ...n.data } }));
      const edgesToRestore = nextState.edges.map(e => ({ ...e, data: { ...e.data } }));

      this.nodesSubject.next(nodesToRestore);
      this.edgesSubject.next(edgesToRestore);
      console.log('Redo performed. Pointer:', this.historyPointer);
    } else {
      console.log('Cannot redo. At newest state.');
    }
  }

  updateElementStyle(elementId: string, styleProperty: string, value: any): void {
    let found = false;
    let currentNodes = this.nodesSubject.getValue();
    let nodeIndex = currentNodes.findIndex(node => node.data.id === elementId);

    if (nodeIndex > -1) {
      const updatedNodeData = { ...currentNodes[nodeIndex].data, [styleProperty]: value };
      const updatedNode = { ...currentNodes[nodeIndex], data: updatedNodeData };
      
      currentNodes = [
        ...currentNodes.slice(0, nodeIndex),
        updatedNode,
        ...currentNodes.slice(nodeIndex + 1)
      ];
      this.nodesSubject.next(currentNodes);
      found = true;
    } else {
      let currentEdges = this.edgesSubject.getValue();
      let edgeIndex = currentEdges.findIndex(edge => edge.data.id === elementId);
      if (edgeIndex > -1) {
        const updatedEdgeData = { ...currentEdges[edgeIndex].data, [styleProperty]: value };
        const updatedEdge = { ...currentEdges[edgeIndex], data: updatedEdgeData };

        currentEdges = [
          ...currentEdges.slice(0, edgeIndex),
          updatedEdge,
          ...currentEdges.slice(edgeIndex + 1)
        ];
        this.edgesSubject.next(currentEdges);
        found = true;
      }
    }

    if (found) {
      this.saveState(this.nodesSubject.getValue(), this.edgesSubject.getValue());
      console.log(`Style '${styleProperty}' for element '${elementId}' updated to '${value}'.`);
    } else {
      console.warn(`Element with ID '${elementId}' not found. Cannot update style.`);
    }
  }

  // --- Parent-Child Style Propagation ---

  private getDescendants(parentNodeId: string, allNodes: ElementDefinition[]): ElementDefinition[] {
    const descendants: ElementDefinition[] = [];
    const directChildren = allNodes.filter(node => node.data.parent === parentNodeId);

    for (const child of directChildren) {
      descendants.push(child);
      // Recursively find children of the current child
      const grandchildren = this.getDescendants(child.data.id!, allNodes);
      descendants.push(...grandchildren);
    }
    return descendants;
  }

  public applyStyleToChildren(parentId: string, propertyName: string, propertyValue: any): void {
    const allNodes = this.getCurrentNodes();
    const parentNode = allNodes.find(node => node.data.id === parentId);

    if (!parentNode) {
      console.warn(`Parent node with ID '${parentId}' not found. Cannot apply style to children.`);
      return;
    }

    // Check if the property being propagated is relevant for nodes
    // (e.g., not an edge-specific property if we were to be very strict,
    // but updateElementStyle handles finding the element type)
    // For now, we assume propertyName is valid for nodes.

    const descendants = this.getDescendants(parentId, allNodes);

    if (descendants.length === 0) {
      console.log(`Parent node '${parentId}' has no descendants. No styles propagated.`);
      return;
    }

    console.log(`Applying style '${propertyName}: ${propertyValue}' to ${descendants.length} descendants of '${parentId}'.`);

    // Apply style to the parent node itself first
    this.updateElementStyle(parentId, propertyName, propertyValue);

    // Then apply to all descendants
    // A single saveState will be called at the end of all updates if we batch them.
    // However, the current requirement is that each child update is undoable.
    // updateElementStyle already calls saveState, so this fulfills that.
    // If batching for a single undo was desired, we'd need to refactor updateElementStyle
    // or create a new batch update method.
    for (const descendant of descendants) {
      this.updateElementStyle(descendant.data.id!, propertyName, propertyValue);
    }
    
    // Note: If we wanted a single undo action for the entire propagation,
    // we would need to collect all changes and then call saveState once.
    // For example, modify updateElementStyle to optionally not save state,
    // then call saveState here after all updates.
    // For now, adhering to "each child update will be a separate undoable action".
    console.log(`Style propagation for '${propertyName}' from parent '${parentId}' complete.`);
  }
}