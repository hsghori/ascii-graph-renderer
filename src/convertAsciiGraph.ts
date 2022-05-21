import assert from "assert";
import produce from "immer";
import { Edge, MarkerType, Node, XYPosition } from "react-flow-renderer";
import * as uuid from "uuid";

type NodeWithName = Node<{ label: string }>;

export interface Graph {
  nodes: Array<NodeWithName>;
  edges: Array<Edge>;
}

function getCharacter(
  asciiGraphLines: Array<string>,
  location: XYPosition
): string {
  const line = asciiGraphLines[location.y];
  if (line == null) {
    return " ";
  }
  if (location.x >= line.length) {
    return " ";
  }
  return line.charAt(location.x);
}

function findStart(line: string, index: number): number {
  for (let i = index; i >= 0; i--) {
    if (line.charAt(i) === "(") {
      return i;
    }
  }
  assert(false, "Expected to find starting character");
  return -1;
}

function handleEdge({
  asciiGraphLines,
  nodes,
  startLocation,
  expectedChar,
  iterateLocation,
}: {
  asciiGraphLines: Array<string>;
  nodes: Array<NodeWithName>;
  startLocation: XYPosition;
  expectedChar: string;
  iterateLocation: (location: XYPosition) => XYPosition;
}): NodeWithName | null {
  let currLocation = iterateLocation(startLocation);
  console.log(currLocation);
  const maxCol = asciiGraphLines
    .map((line) => line.length)
    .reduce((prev, curr) => Math.max(prev, curr), 0);
  let foundNode = false;
  while (
    !foundNode &&
    currLocation.x < maxCol &&
    currLocation.y < asciiGraphLines.length
  ) {
    const currChar = getCharacter(asciiGraphLines, currLocation);
    if (currChar.match(/[\*\w\(\)]/)) {
      const column = findStart(asciiGraphLines[currLocation.y], currLocation.x);
      currLocation = {
        ...currLocation,
        x: column,
      };
      foundNode = true;
      break;
    } else if (currChar != expectedChar) {
      return null;
    }
    currLocation = iterateLocation(currLocation);
  }

  return (
    nodes.find(
      ({ position }) =>
        currLocation.x === position.x && currLocation.y === position.y
    ) ?? null
  );
}

function getInitialLocation({
  asciiGraphLines,
  startNode,
  rowOffset,
  targetCharacter,
}: {
  asciiGraphLines: Array<string>;
  startNode: NodeWithName;
  rowOffset: number;
  targetCharacter: string;
}): XYPosition {
  const startLocation = startNode.position;
  return produce(startLocation, (draftLocation) => {
    for (
      let i = draftLocation.x;
      i < startNode.data.label.length + startLocation.x;
      i++
    ) {
      const currChar = getCharacter(asciiGraphLines, {
        y: draftLocation.y + rowOffset,
        x: i,
      });
      if (currChar === targetCharacter) {
        draftLocation.x = i;
        break;
      }
    }
  });
}

function handleHorizontalEdge(
  asciiGraphLines: Array<string>,
  nodes: Array<NodeWithName>,
  startNode: NodeWithName
): NodeWithName | null {
  const startLocation = startNode.position;
  return handleEdge({
    asciiGraphLines,
    nodes,
    startLocation: produce(startLocation, (draftLocation) => {
      draftLocation.x += startNode.data.label.length - 1;
    }),
    expectedChar: "-",
    iterateLocation: (loc: XYPosition): XYPosition =>
      produce(loc, (draftLocation) => {
        draftLocation.x++;
      }),
  });
}

function handleUpEdge(
  asciiGraphLines: Array<string>,
  nodes: Array<NodeWithName>,
  startNode: NodeWithName
): NodeWithName | null {
  const startLocation = startNode.position;
  if (startLocation.y === 0) {
    return null;
  }
  return handleEdge({
    asciiGraphLines,
    nodes,
    startLocation: getInitialLocation({
      asciiGraphLines,
      startNode,
      rowOffset: -1,
      targetCharacter: "|",
    }),
    expectedChar: "|",
    iterateLocation: (loc: XYPosition): XYPosition =>
      produce(loc, (draftLocation) => {
        draftLocation.y--;
      }),
  });
}

function handleDownEdge(
  asciiGraphLines: Array<string>,
  nodes: Array<NodeWithName>,
  startNode: NodeWithName
): NodeWithName | null {
  const startLocation = startNode.position;
  if (startLocation.y === asciiGraphLines.length - 1) {
    return null;
  }
  return handleEdge({
    asciiGraphLines,
    nodes,
    startLocation: getInitialLocation({
      asciiGraphLines,
      startNode,
      rowOffset: 1,
      targetCharacter: "|",
    }),
    expectedChar: "|",
    iterateLocation: (loc: XYPosition): XYPosition =>
      produce(loc, (draftLocation) => {
        draftLocation.y++;
      }),
  });
}

function handleDiagUpEdge(
  asciiGraphLines: Array<string>,
  nodes: Array<NodeWithName>,
  startNode: NodeWithName
): NodeWithName | null {
  const startLocation = startNode.position;
  if (startLocation.y === 0) {
    return null;
  }
  const initialLocation = () => {
    const position = getInitialLocation({
      asciiGraphLines,
      startNode,
      rowOffset: -1,
      targetCharacter: "/",
    });
    return {
      ...position,
      x: position.x - 1,
    };
  };
  return handleEdge({
    asciiGraphLines,
    nodes,
    startLocation: initialLocation(),
    expectedChar: "/",
    iterateLocation: (loc: XYPosition): XYPosition =>
      produce(loc, (draftLocation) => {
        draftLocation.x++;
        draftLocation.y--;
      }),
  });
}

function handleDiagDownEdge(
  asciiGraphLines: Array<string>,
  nodes: Array<NodeWithName>,
  startNode: NodeWithName
): NodeWithName | null {
  const initialLocation = () => {
    const position = getInitialLocation({
      asciiGraphLines,
      startNode,
      rowOffset: 1,
      targetCharacter: "\\",
    });
    return {
      ...position,
      x: position.x - 1,
    };
  };
  return handleEdge({
    asciiGraphLines,
    nodes,
    startLocation: initialLocation(),
    expectedChar: "\\",
    iterateLocation: (loc: XYPosition): XYPosition =>
      produce(loc, (draftLocation) => {
        draftLocation.x++;
        draftLocation.y++;
      }),
  });
}

function getAllEdges(
  asciiGraphLines: Array<string>,
  startNode: NodeWithName,
  nodes: Array<NodeWithName>
): Array<Edge> {
  const nextNodeFns = [
    handleHorizontalEdge,
    handleUpEdge,
    handleDownEdge,
    handleDiagUpEdge,
    handleDiagDownEdge,
  ];
  const edges: Array<Edge> = [];
  for (const nextNodeFn of nextNodeFns) {
    const nextNode = nextNodeFn(asciiGraphLines, nodes, startNode);
    if (nextNode != null && nextNode.id !== startNode.id) {
      edges.push({
        id: uuid.v4(),
        source: startNode.id,
        target: nextNode.id,
        type: "smoothstep",
        markerEnd: {
          type: MarkerType.Arrow,
        },
      });
    }
  }
  return edges;
}

export default function convertAsciiGraph(asciiGraph: string): Graph {
  const lines = asciiGraph.split("\n");
  const nodesRegex = /\((\*)?\w+\)/g;
  const nodes: Array<NodeWithName> = [];
  lines.forEach((line, rowIdx) => {
    const matches = line.matchAll(nodesRegex);
    for (const match of matches) {
      const position = { y: rowIdx, x: match.index! };
      nodes.push({
        id: uuid.v4(),
        data: {
          label: match[0],
        },
        position,
      });
    }
  });

  const nodesById = nodes.reduce((acc, curr) => {
    acc[curr.id] = curr;
    return acc;
  }, {} as { [id: string]: NodeWithName });

  if (nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const startingNode = nodes.find(({ data }) => data.label.startsWith("(*"));
  if (startingNode == null) {
    console.warn(
      "Expected graph to have a starting node. Starting nodes begin with a '*' character."
    );
    return { nodes: [], edges: [] };
  }

  const queue: Array<NodeWithName> = [startingNode];
  const visitedIds = new Set<string>();
  const edges: Array<Edge> = [];
  const edgeStrings: Set<string> = new Set();
  const makeEdgeString = (edge: Omit<Edge, "id">) =>
    `${edge.source}-${edge.target}`;

  while (queue.length > 0) {
    const curr = queue.splice(0, 1)[0];
    const nodeEdges = getAllEdges(lines, curr, nodes);
    for (const edge of nodeEdges) {
      const edgeString = makeEdgeString(edge);
      const reversedEdgeString = makeEdgeString({
        source: edge.target,
        target: edge.source,
      });
      if (edgeStrings.has(edgeString) || edgeStrings.has(reversedEdgeString)) {
        continue;
      }
      edgeStrings.add(edgeString);
      edgeStrings.add(reversedEdgeString);
      edges.push(edge);
    }
    visitedIds.add(curr.id);
    for (const nextEdge of nodeEdges) {
      const nextNode = nodesById[nextEdge.target];
      if (nextNode != null && !visitedIds.has(nextNode.id)) {
        queue.push(nextNode);
      }
    }
  }

  return { nodes, edges };
}
