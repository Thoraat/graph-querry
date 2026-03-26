import Graph from "./components/Graph.jsx";
import Chat from "./components/Chat.jsx";

export default function App() {
  return (
    <div className="appLayout" style={{ display: "flex", height: "100vh" }}>
      <section className="panelBox" style={{ flex: 1, minWidth: 0 }}>
        <div className="panelHeader">
          <div className="panelTitle">Graph</div>
        </div>
        <div className="panelBody">
          <Graph />
        </div>
      </section>

      <section className="panelBox" style={{ flex: 1, minWidth: 0 }}>
        <div className="panelHeader">
          <div className="panelTitle">Chat</div>
        </div>
        <div className="panelBody">
          <Chat />
        </div>
      </section>
    </div>
  );
}

