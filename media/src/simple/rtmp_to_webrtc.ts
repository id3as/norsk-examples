import { Norsk, selectAudio, selectAV, selectVideo } from "@id3as/norsk-sdk";
import express from "express";

import * as Example from "../interface";



export async function main() {
  const norsk = new Norsk({
    url: "localhost:6790",
    onShutdown: () => {
      console.log("Norsk has shutdown");
      process.exit(1);
    },
  });

  let rtmpSettings = { id: "rtmpInput", port: 5001 };
  let localRtcSettings = { id: "localRtcOutput" };

  let input = await norsk.input.rtmpServer(rtmpSettings);
  let output = await norsk.duplex.localWebRTC(localRtcSettings);

  output.subscribe([
    { source: input, sourceSelector: selectAV },
  ]);

  console.log(`Local player: ${output.playerUrl}`);
}

export const main_interface: Example.Interface = {
  nodes: ["localRtcOutput", "rtmpInput"],
  inputs: [
    Example.ffmpegCommand(
      Example.rtmpOutput({ port: 5001, app: "acme", str: "high" })
    ),
  ],
  outputs: {
    audio: ["localRtcOutput"],
    video: ["localRtcOutput"],
  },
  description:
    "Subscribe to an RTMP source and generate local WebRTC output form it",
};
