import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ReactFlow, Background, Controls, Handle, Position } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// Empty by default so requests go through Vite proxy (`/graph`, `/query`).
const API_BASE = import.meta.env.VITE_API_BASE || "";

function computeLayout(nodes) {
  // Simple deterministic layout: grid placement (good enough for a demo).
  // Keep spacing compact so the viewport doesn't zoom out too far.
  const n = Math.max(1, nodes.length);
  const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
  const xGap = 180;
  const yGap = 110;
  return nodes.map((node, i) => {
    const x = (i % cols) * xGap;
    const y = Math.floor(i / cols) * yGap;
    return { ...node, position: { x, y } };
  });
}

const DatasetNode = ({ data }) => {
  const { label, originalType, onSelect } = data || {};
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect?.();
      }}
      style={{
        padding: 10,
        border: "1px solid #cfcfcf",
        borderRadius: 10,
        background: "white",
        cursor: onSelect ? "pointer" : "default",
        textAlign: "center",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        minWidth: 140
      }}
      title={originalType ? String(originalType) : undefined}
    >
      {/* Handles provide connection points so edges have visible anchor positions. */}
      <Handle type="target" position={Position.Left} style={{ background: "#444" }} />
      <Handle type="source" position={Position.Right} style={{ background: "#444" }} />

      <div style={{ fontWeight: 700, fontSize: 13, lineHeight: "16px" }}>{label}</div>
      {originalType ? (
        <div style={{ marginTop: 6, fontSize: 11, color: "#666" }}>{originalType}</div>
      ) : null}
    </div>
  );
};

export default function Graph() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawGraph, setRawGraph] = useState({ nodes: [], edges: [] });
  const [selected, setSelected] = useState(null);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE}/graph`);
      const nodes = Array.isArray(res.data?.nodes) ? res.data.nodes : [];
      const edges = Array.isArray(res.data?.edges) ? res.data.edges : [];
      setRawGraph({ nodes, edges });
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Failed to load graph.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  const handleSelectNode = useCallback((node) => {
    setSelected(node);
  }, []);

  const rfNodes = useMemo(() => {
    const nodes = rawGraph.nodes || [];
    const laidOut = computeLayout(nodes);
    return laidOut.map((n) => ({
      id: String(n.id),
      type: "datasetNode",
      position: n.position,
      draggable: false,
      data: {
        label: n.label ? String(n.label) : String(n.id),
        originalType: n.type ? String(n.type) : undefined,
        onSelect: () => handleSelectNode(n)
      }
    }));
  }, [rawGraph.nodes, handleSelectNode]);

  const rfEdges = useMemo(() => {
    const edges = rawGraph.edges || [];
    return edges.map((e) => ({
      id: String(e.id),
      source: String(e.source),
      target: String(e.target),
      label: e.label ? String(e.label) : undefined,
      type: "default",
      animated: true,
      style: { stroke: "#444", strokeWidth: 2 }
    }));
  }, [rawGraph.edges]);

  useEffect(() => {
    // Debug: verify node/edge IDs and ensure edges point at actual node IDs.
    console.log("Nodes:", rfNodes);
    console.log("Edges:", rfEdges);
  }, [rfNodes, rfEdges]);

  const nodeTypes = useMemo(
    () => ({
      datasetNode: DatasetNode
    }),
    []
  );

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: 12, borderBottom: "1px solid #f0f0f0", display: "flex", gap: 10 }}>
        <button className="smallButton" type="button" onClick={fetchGraph} disabled={loading}>
          Refresh
        </button>
        <div style={{ fontSize: 12, color: "#555", alignSelf: "center" }}>
          {selected ? (
            <>
              Selected: <span style={{ fontWeight: 700 }}>{selected.label}</span>
            </>
          ) : (
            "Click a node to preview selection."
          )}
        </div>
      </div>

      <div className="graphArea">
        {loading ? (
          <div className="graphLoading">Loading graph...</div>
        ) : error ? (
          <div className="graphLoading" style={{ color: "#b00020" }}>
            {String(error)}
          </div>
        ) : (
          <div style={{ width: "100%", height: "100%" }}>
            <ReactFlow
              nodes={rfNodes}
              edges={rfEdges}
              nodeTypes={nodeTypes}
              fitView
              style={{ width: "100%", height: "100%" }}
            >
              <Controls />
              <Background variant="lines" gap={16} size={1} />
            </ReactFlow>
          </div>
        )}
      </div>

      <div className="graphFooter">
        {rawGraph.nodes.length} nodes · {rawGraph.edges.length} edges
      </div>
    </div>
  );
}

