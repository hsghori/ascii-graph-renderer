import assert from "assert";
import produce from "immer";
import { Edge, MarkerType, Node } from "react-flow-renderer";
import * as uuid from "uuid";

type NodeWithName = Node<{ label: string }>;

export interface Graph {
  nodes: Array<NodeWithName>;
  edges: Array<Edge>;
}

interface Location {
  row: number;
  column: number;
}

interface NodeAndLocation {
  node: NodeWithName;
  location: Location;
}

function getCharacter(
  asciiGraphLines: Array<string>,
  location: Location
): string {
  const line = asciiGraphLines[location.row];
  if (line == null) {
    return " ";
  }
  if (location.column >= line.length) {
    return " ";
  }
  return line.charAt(location.column);
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
  nodeAndLocations,
  startLocation,
  expectedChar,
  iterateLocation,
}: {
  asciiGraphLines: Array<string>;
  nodeAndLocations: Array<NodeAndLocation>;
  startLocation: Location;
  expectedChar: string;
  iterateLocation: (location: Location) => Location;
}): NodeAndLocation | null {
  let currLocation = iterateLocation(startLocation);
  const maxCol = asciiGraphLines
    .map((line) => line.length)
    .reduce((prev, curr) => Math.max(prev, curr), 0);
  let foundNode = false;
  while (
    !foundNode &&
    currLocation.column < maxCol &&
    currLocation.row < asciiGraphLines.length
  ) {
    const currChar = getCharacter(asciiGraphLines, currLocation);
    console.log({ currChar, code: currChar[0].charCodeAt(0) });
    if (currChar.match(/[\*\w\(\)]/)) {
      const column = findStart(
        asciiGraphLines[currLocation.row],
        currLocation.column
      );
      currLocation = {
        ...currLocation,
        column,
      };
      foundNode = true;
      break;
    } else if (currChar != expectedChar) {
      return null;
    }
    currLocation = iterateLocation(currLocation);
  }

  return (
    nodeAndLocations.find(
      ({ location }) =>
        currLocation.column === location.column &&
        currLocation.row === location.row
    ) ?? null
  );
}

function getInitialLocation({
  asciiGraphLines,
  startNodeAndLocation,
  rowOffset,
  targetCharacter,
}: {
  asciiGraphLines: Array<string>;
  startNodeAndLocation: NodeAndLocation;
  rowOffset: number;
  targetCharacter: string;
}): Location {
  const startLocation = startNodeAndLocation.location;
  return produce(startLocation, (draftLocation) => {
    for (
      let i = draftLocation.column;
      i < startNodeAndLocation.node.data.label.length + startLocation.column;
      i++
    ) {
      const currChar = getCharacter(asciiGraphLines, {
        row: draftLocation.row + rowOffset,
        column: i,
      });
      if (currChar === targetCharacter) {
        draftLocation.column = i;
        break;
      }
    }
  });
}

function handleHorizontalEdge(
  asciiGraphLines: Array<string>,
  nodeAndLocations: Array<NodeAndLocation>,
  startNodeAndLocation: NodeAndLocation
): NodeAndLocation | null {
  const startLocation = startNodeAndLocation.location;
  return handleEdge({
    asciiGraphLines,
    nodeAndLocations,
    startLocation: produce(startLocation, (draftLocation) => {
      draftLocation.column += startNodeAndLocation.node.data.label.length - 1;
    }),
    expectedChar: "-",
    iterateLocation: (loc: Location): Location =>
      produce(loc, (draftLocation) => {
        draftLocation.column++;
      }),
  });
}

function handleUpEdge(
  asciiGraphLines: Array<string>,
  nodeAndLocations: Array<NodeAndLocation>,
  startNodeAndLocation: NodeAndLocation
): NodeAndLocation | null {
  const startLocation = startNodeAndLocation.location;
  if (startLocation.row === 0) {
    return null;
  }
  return handleEdge({
    asciiGraphLines,
    nodeAndLocations,
    startLocation: getInitialLocation({
      asciiGraphLines,
      startNodeAndLocation,
      rowOffset: -1,
      targetCharacter: "|",
    }),
    expectedChar: "|",
    iterateLocation: (loc: Location): Location =>
      produce(loc, (draftLocation) => {
        draftLocation.row--;
      }),
  });
}

function handleDownEdge(
  asciiGraphLines: Array<string>,
  nodeAndLocations: Array<NodeAndLocation>,
  startNodeAndLocation: NodeAndLocation
): NodeAndLocation | null {
  const startLocation = startNodeAndLocation.location;
  if (startLocation.row === asciiGraphLines.length - 1) {
    return null;
  }
  return handleEdge({
    asciiGraphLines,
    nodeAndLocations,
    startLocation: getInitialLocation({
      asciiGraphLines,
      startNodeAndLocation,
      rowOffset: 1,
      targetCharacter: "|",
    }),
    expectedChar: "|",
    iterateLocation: (loc: Location): Location =>
      produce(loc, (draftLocation) => {
        draftLocation.row++;
      }),
  });
}

function handleDiagUpEdge(
  asciiGraphLines: Array<string>,
  nodeAndLocations: Array<NodeAndLocation>,
  startNodeAndLocation: NodeAndLocation
): NodeAndLocation | null {
  const startLocation = startNodeAndLocation.location;
  if (startLocation.row === 0) {
    return null;
  }
  const initialLocation = () => {
    const location = getInitialLocation({
      asciiGraphLines,
      startNodeAndLocation,
      rowOffset: -1,
      targetCharacter: "/",
    });
    return {
      ...location,
      column: location.column - 1,
    };
  };
  return handleEdge({
    asciiGraphLines,
    nodeAndLocations,
    startLocation: initialLocation(),
    expectedChar: "/",
    iterateLocation: (loc: Location): Location =>
      produce(loc, (draftLocation) => {
        draftLocation.column++;
        draftLocation.row--;
      }),
  });
}

function handleDiagDownEdge(
  asciiGraphLines: Array<string>,
  nodeAndLocations: Array<NodeAndLocation>,
  startNodeAndLocation: NodeAndLocation
): NodeAndLocation | null {
  const initialLocation = () => {
    const location = getInitialLocation({
      asciiGraphLines,
      startNodeAndLocation,
      rowOffset: 1,
      targetCharacter: "\\",
    });
    return {
      ...location,
      column: location.column - 1,
    };
  };
  return handleEdge({
    asciiGraphLines,
    nodeAndLocations,
    startLocation: initialLocation(),
    expectedChar: "\\",
    iterateLocation: (loc: Location): Location =>
      produce(loc, (draftLocation) => {
        draftLocation.column++;
        draftLocation.row++;
      }),
  });
}

function getAllEdges(
  asciiGraphLines: Array<string>,
  startNodeAndLocation: NodeAndLocation,
  nodeAndLocations: Array<NodeAndLocation>
) {
  const nextNodeFns = [
    handleHorizontalEdge,
    handleUpEdge,
    handleDownEdge,
    handleDiagUpEdge,
    handleDiagDownEdge,
  ];
  const edges: Array<Edge> = [];
  for (const nextNodeFn of nextNodeFns) {
    const nextNode = nextNodeFn(
      asciiGraphLines,
      nodeAndLocations,
      startNodeAndLocation
    );
    if (nextNode != null && nextNode.node.id !== startNodeAndLocation.node.id) {
      edges.push({
        id: uuid.v4(),
        source: startNodeAndLocation.node.id,
        target: nextNode.node.id,
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
  const nodeAndLocations: Array<NodeAndLocation> = [];
  lines.forEach((line, rowIdx) => {
    const matches = line.matchAll(nodesRegex);
    for (const match of matches) {
      const location = { row: rowIdx, column: match.index! };
      nodeAndLocations.push({
        node: {
          id: uuid.v4(),
          data: {
            label: match[0],
          },
          position: { x: match.index!, y: rowIdx },
        },
        location,
      });
    }
  });

  const nodeAndLocationsById = nodeAndLocations.reduce((acc, curr) => {
    acc[curr.node.id] = curr;
    return acc;
  }, {} as { [id: string]: NodeAndLocation });

  if (nodeAndLocations.length === 0) {
    return { nodes: [], edges: [] };
  }

  const startingNode = nodeAndLocations.find(({ node }) =>
    node.data.label.startsWith("(*")
  );
  if (startingNode == null) {
    console.warn(
      "Expected graph to have a starting node. Starting nodes begin with a '*' character."
    );
    return { nodes: [], edges: [] };
  }

  const queue: Array<NodeAndLocation> = [startingNode];
  const visitedIds = new Set<string>();
  const edges: Array<Edge> = [];
  const edgeStrings: Set<string> = new Set();
  const makeEdgeString = (edge: Omit<Edge, "id">) =>
    `${edge.source}-${edge.target}`;

  while (queue.length > 0) {
    const curr = queue.splice(0, 1)[0];
    const nodeEdges = getAllEdges(lines, curr, nodeAndLocations);
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
    visitedIds.add(curr.node.id);
    for (const nextEdge of nodeEdges) {
      const nextNode = nodeAndLocationsById[nextEdge.target];
      if (nextNode != null && !visitedIds.has(nextNode.node.id)) {
        queue.push(nextNode);
      }
    }
  }

  return { nodes: nodeAndLocations.map(({ node }) => node), edges };
}
