import { Norsk, SrtInputSettings, StreamMetadata } from "@id3as/norsk-sdk"

import * as Example from "../interface";


export async function main() {
  const norsk = new Norsk({
    onShutdown: () => {
      console.log("Norsk has shutdown");
      process.exit(1)
    }
  });

  let srtInputSettings: SrtInputSettings = {
    id: "srtInput",
    ip: "127.0.0.1",
    port: 5001,
    mode: "listener",
    sourceName: "camera1",
  };

  let localRtcSettings = {
    id: "localRtcOutput",
  };

  let input = await norsk.input.srt(srtInputSettings);
  let output = await norsk.duplex.localWebRTC(localRtcSettings);

  output.subscribe([
    {
      source: input,
      sourceSelector: (streams: StreamMetadata[]) =>
        streams
          .map((stream) => stream.streamKey)
          .filter((v): v is Exclude<typeof v, undefined> => v !== undefined),
    },
  ]);

  console.log(`Local player: ${output.playerUrl}`);
}

export const main_interface: Example.Interface = {
  nodes: ["localRtcOutput"],
  inputs: [Example.ffmpegCommand(Example.srtOutput({ port: 5001 }))],
  outputs: {
    audio: ["localRtcOutput"],
    video: ["localRtcOutput"],
  },
  description: "Subscribes to an SRT source and generates local WebRTC output from it"
};
