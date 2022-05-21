import { css, StyleSheet } from "aphrodite";
import dagre, { graphlib } from "dagre";
import React from "react";
import ReactFlow, {
  ConnectionLineType,
  Edge,
  Node,
  Position,
} from "react-flow-renderer";
import { Graph } from "./convertAsciiGraph";

interface GraphViewerProps {
  graph: Graph;
}

const nodeWidth = 172;
const nodeHeight = 36;

const getLayoutedElements = (
  dagreGraph: graphlib.Graph,
  nodes: Array<Node>,
  edges: Array<Edge>,
  direction: string = "TB"
): { layoutNodes: Array<Node>; layoutEdges: Array<Edge> } => {
  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });
  console.log({ nodes, edges });
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = isHorizontal ? Position.Left : Position.Top;
    node.sourcePosition = isHorizontal ? Position.Top : Position.Bottom;

    // We are shifting the dagre node position (anchor=center center) to the top left
    // so it matches the React Flow node anchor point (top left).
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };

    return node;
  });

  return { layoutNodes: nodes, layoutEdges: edges };
};

export default function GraphViewer(props: GraphViewerProps): JSX.Element {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  const { layoutNodes, layoutEdges } = getLayoutedElements(
    dagreGraph,
    props.graph.nodes,
    props.graph.edges
  );

  return (
    <div className={css(styles.layoutFlow)}>
      <ReactFlow
        nodes={layoutNodes}
        edges={layoutEdges}
        connectionLineType={ConnectionLineType.SmoothStep}
      />
    </div>
  );
}

const styles = StyleSheet.create({
  layoutFlow: {
    marginLeft: "2px",
    flexGrow: 1,
  },
});
