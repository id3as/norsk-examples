import { Norsk, selectAV } from "@id3as/norsk-sdk"

import * as Example from "../interface";


export async function main() {
  const norsk = new Norsk({
    url: "localhost:6790",
    onShutdown: () => {
      console.log("Norsk has shutdown");
      process.exit(1)
    }
  });

  let input = await norsk.input.rtmpServer({ id: "rtmpInput", port: 5001 });
  let output = await norsk.output.localMp4File({
    id: "localMp4Output",
    fragmentedFileName: "/tmp/norskOutput.fmp4",
    nonfragmentedFileName: "/tmp/norskOutput.mp4",
    onEnd: () => {
      console.log("Closing Norsk");
      norsk.close();
    },
  });

  output.subscribe([{ source: input, sourceSelector: selectAV }]);

  // We can write non-fragmented snapshots periodically
  let i = 0;
  setInterval(() => output.writeFile(`/tmp/norskOutput${i += 1}.mp4`), 15000);

  // And close it to write out the non-fragmented file name set in config
  // (will close norsk via onEnd callback above)
  setTimeout(() => output.close(), 120000);
}

export const main_interface: Example.Interface = {
  nodes: ["rtmpInput", "localMp4Output"],
  inputs: [Example.ffmpegCommand(Example.rtmpOutput({ port: 5001, app: "norsk", str: "high" }))],
  outputs: {
    audio: ["localMp4Output"],
    video: ["localMp4Output"],
  },
};
