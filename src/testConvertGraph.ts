import fs from "fs/promises";
import yargs from "yargs";
import convertAsciiGraph from "./convertAsciiGraph";

async function main(): Promise<void> {
  const args = await yargs
    .command("file [file]", "run with file", (yarg) =>
      yarg.positional("file", {
        describe: "Path to the file",
        default: "./graph.txt",
      })
    )
    .parse();

  const file = await fs.readFile(args.file, { encoding: "utf-8" });

  console.log(file);
  console.log(convertAsciiGraph(file));
}

main();
