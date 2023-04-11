import { Norsk, selectAV } from "@id3as/norsk-sdk";
import fs from "fs/promises";

import * as Example from "../interface";


export async function main() {
  const fileName = await fs.realpath("./data/mp4_h264_fragmented.mp4");

  const norsk = new Norsk({ url: "localhost:6790" });

  let input = await norsk.input.localMp4File({ id: "mp4File", sourceName: "example.mp4", fileName: fileName });
  let output = await norsk.duplex.localWebRTC({ id: "localRtcOutput" });

  output.subscribe([{ source: input, sourceSelector: selectAV }]);

  console.log(`Local player: ${output.playerUrl}`);
}

export const main_interface: Example.Interface = {
  nodes: ["mp4File", "localRtcOutput"],
  inputs: [], // TODO: need to put together some example files
  outputs: {
    audio: ["localRtcOutput"],
    video: ["localRtcOutput"],
  },
};
