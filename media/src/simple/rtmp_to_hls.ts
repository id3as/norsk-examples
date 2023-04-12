import { Norsk, selectAudio, selectAV, selectVideo } from "@id3as/norsk-sdk";

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
  let delayOutputMs = 500.0;
  let masterPlaylistSettings = { id: "master", playlistName: "master" };

  let audio = {
    id: "audio",
    partDurationSeconds: 1.0,
    segmentDurationSeconds: 4.0,
    delayOutputMs,
  };
  let high = {
    id: "high",
    partDurationSeconds: 1.0,
    segmentDurationSeconds: 4.0,
    delayOutputMs,
  };

  let input = await norsk.input.rtmpServer(rtmpSettings);

  let videoStreamKeyConfig = {
    id: "video_stream_key",
    streamKey: {
      programNumber: 1,
      renditionName: "video",
      streamId: 256,
      sourceName: "input",
    },
  };

  let audioStreamKeyConfig = {
    id: "audio_stream_key",
    streamKey: {
      programNumber: 1,
      renditionName: "audio",
      streamId: 257,
      sourceName: "input",
    },
  };

  let videoInput = await norsk.processor.transform.streamKeyOverride(
    videoStreamKeyConfig
  );
  let audioInput = await norsk.processor.transform.streamKeyOverride(
    audioStreamKeyConfig
  );

  videoInput.subscribe([
    { source: input, sourceSelector: selectVideo },
  ]);
  audioInput.subscribe([
    { source: input, sourceSelector: selectAudio },
  ]);

  let masterOutput = await norsk.output.hlsMaster(masterPlaylistSettings);
  let audioOutput = await norsk.output.hlsAudio(audio);
  let highOutput = await norsk.output.hlsVideo(high);

  highOutput.subscribe([
    { source: videoInput, sourceSelector: selectVideo },
  ]);
  audioOutput.subscribe([
    { source: audioInput, sourceSelector: selectAudio },
  ]);

  masterOutput.subscribe([
    { source: videoInput, sourceSelector: selectVideo },
    { source: audioInput, sourceSelector: selectAudio },
  ]);


  console.log(`Local player: ${masterOutput.playlistUrl}`);
}

export const main_interface: Example.Interface = {
  nodes: ["rtmpInput", "master", "audio", "high"],
  inputs: [Example.ffmpegCommand(Example.rtmpOutput({ port: 5001, app: "norsk", str: "high" }))],
  outputs: {
    audio: ["master"],
    video: ["master"],
    playlists: [
      "256-video",
      "257-audio"
    ]
  },
};
