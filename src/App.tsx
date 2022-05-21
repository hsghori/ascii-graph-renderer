import { css, StyleSheet } from "aphrodite";
import React, { useMemo, useState } from "react";
import AsciiInput from "./AsciiInput";
import convertAsciiGraph from "./convertAsciiGraph";
import GraphViewer from "./GraphViewer";

function App() {
  const [text, setText] = useState("");
  console.log(
    text.split("\n").map((line) => {
      const lineCodes = [];
      console.log(line);
      for (let i = 0; i < line.length; i++) {
        lineCodes.push(line.charCodeAt(i));
      }
      return lineCodes;
    })
  );
  const graph = useMemo(() => convertAsciiGraph(text), [text]);

  return (
    <div className={css(styles.root)}>
      <AsciiInput value={text} onChange={setText} />
      <GraphViewer graph={graph} />
    </div>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: "16px",
    display: "flex",
    flexDirection: "row",
    alignItems: "stretch",
  },
});

export default App;
