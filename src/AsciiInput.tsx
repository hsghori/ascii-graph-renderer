import React from "react";
import ReactAce from "react-ace/lib/ace";

interface AsciiInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function AsciiInput(props: AsciiInputProps): JSX.Element {
  return <ReactAce mode="text" value={props.value} onChange={props.onChange} />;
}
