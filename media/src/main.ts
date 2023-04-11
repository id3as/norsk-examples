import yargs from "yargs";
import fs from "fs/promises";
import process from "process";

import * as Example from "./interface";

async function list() {
  let root = __dirname;
  let results: string[] = [];
  for (let dirO of await fs.readdir(root, { withFileTypes: true })) {
    if (!dirO.isDirectory()) continue;
    let dir = dirO.name;
    for (let fileO of await fs.readdir(root+"/"+dir, { withFileTypes: true })) {
      if (!fileO.isFile() && !fileO.isSymbolicLink()) continue;
      let file = fileO.name;
      if (file.endsWith(".js")) {
        file = file.substring(0, file.length - 3);
      } else if (file.endsWith(".ts")) {
        if (file.endsWith(".d.ts")) continue;
        file = file.substring(0, file.length - 3);
      } else continue;
      results.push(dir+"/"+file);
    }
  }
  return results;
}

function load(name: string) {
  let root = __dirname;
  if (name.startsWith("./")) root = ".";

  return require(root + "/" + name) as ExampleModule
}

yargs
  .scriptName("run-media-example")
  .command({
    command: "list",
    describe: "List all examples",
    builder: (args: yargs.Argv<{}>) => args
      .options({
        "interface": {
          describe: "Get the interface for each extant example",
          choices: ["json", "ports", "description"] as const,
        },
      }),
    handler: async (args) => {
      let modules = await list();

      if (args.interface) {
        let ifaces = modules.map(load).map(module => module.main_interface);
        switch (args.interface) {
          case "json":
            console.log(JSON.stringify(ifaces));
            break;
          case "ports":
            let ports: ([number, "tcp"] | [number, "udp"])[] = [];
            for (let iface of ifaces) {
              if (!iface.inputs) continue;
              for (let input of iface.inputs) {
                if (!input.ports) continue;
                for (let port of input.ports) {
                  let found = false;
                  for (let ext of ports) {
                    if (ext[0] === port[0] && ext[1] === port[1]) {
                      found = true; break
                    }
                  }
                  if (!found) ports.push(port);
                }
              }
            }
            console.log(ports.join('\n'));
            break;
          case "description":
            console.log(ifaces.map(iface => iface.description || "").join('\n') || '');
            break;
          default:
            const exhaustiveCheck: never = args.interface;
            console.log("Missing interface handler", exhaustiveCheck);
        }
      } else {
        for (let module of await list()) {
          console.log(module);
        }
      }
    },
  })
  .command({
    command: "run <example>",
    aliases: ["$0"],
    describe: "Run a particular example",
    builder: (args: yargs.Argv<{}>) => args
      .options({
        "interface": {
          describe: "Get the interface for the example",
          choices: ["json", "ffmpeg", "ports", "urls", "description"] as const,
        },
      })
      .options({
        "runner": {
          choices: [true] as const,
          nargs: 0,
        },
      })
      .positional("example", {
        type: "string",
        demandOption: true,
      }),
    handler: async (args: RunArguments) => {
      let example = load(args.example);
      let iface = example.main_interface;

      if (args.interface) {
        switch (args.interface) {
          case "json":
            console.log(JSON.stringify(iface));
            break;
          case "ffmpeg":
            console.log(iface.inputs?.map(x => x.rendered)?.join('\n') || '');
            break;
          case "ports":
            console.log(iface.inputs?.map(x => x.ports)?.join('\n') || '');
            break;
          case "urls":
            console.log(iface.inputs?.map(x => x.urls)?.join('\n') || '');
            break;
          case "description":
            console.log(iface.description || '');
            break;
          default:
            const exhaustiveCheck: never = args.interface;
            console.log("Missing interface handler", exhaustiveCheck);
        }
      } else {
        Example.main(example.main, args.runner ? iface : undefined);
      }
    },
  }).help().argv;

type ExampleModule = {
  main: () => Promise<undefined>,
  main_interface: Example.Interface,
};

type RunArguments = {
  [x: string]: unknown;
  interface?: "json" | "ffmpeg" | "ports" | "urls" | "description" | undefined;
  runner?: boolean;
  example: string;
  _: (string | number)[];
  $0: string;
};
