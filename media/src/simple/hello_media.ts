import { Norsk, selectAV } from "@id3as/norsk-sdk"

import * as Example from "../interface";


export async function main() {
  const norsk = new Norsk({ url: "localhost:6790" });  

  let input = await norsk.input.rtmpServer({ id: "rtmpInput", port: 5001 }); 
  let output = await norsk.duplex.localWebRTC({ id: "localRtcOutput" }); 

  output.subscribe([{ source: input, sourceSelector: selectAV }]); 

  console.log(`Local player: ${output.playerUrl}`);
}

export const main_interface: Example.Interface = {
  nodes: ["rtmpInput", "localRtcOutput"],
  inputs: [Example.ffmpegCommand(Example.rtmpOutput({ port: 5001, app: "norsk", str: "high" }))],
  outputs: {
    audio: ["localRtcOutput"],
    video: ["localRtcOutput"],
  },
};
