import { AudioSignalGeneratorSettings, HlsAudioOutputSettings, mkSine, Norsk, selectAudio } from "@id3as/norsk-sdk"

import * as Example from "../interface";


export async function main() {
  const norsk = new Norsk({
    url: "localhost:6790",
    onShutdown: () => {
      console.log("Norsk has shutdown");
      process.exit(1)
    }
  });
  let audioSignalSettings: AudioSignalGeneratorSettings = {
    id: "audio-signal",
    sourceName: "signal",
    channelLayout: "stereo",
    sampleRate: 48000,
    sampleFormat: "flt",
    wave: mkSine(440),
  }
  let input = await norsk.input.audioSignal(audioSignalSettings);

  let delayOutputMs = 500.0;
  let audio: HlsAudioOutputSettings = {
    id: "hls-audio",
    partDurationSeconds: 1.0,
    segmentDurationSeconds: 4.0,
    delayOutputMs,
  };
  let audioOutput = await norsk.output.hlsAudio(audio);
  audioOutput.subscribe([{ source: input, sourceSelector: selectAudio }]);
  console.log(
    "Media playlist",
    "http://localhost:6791/localHls/file/stream/1-default/playlist.m3u8"
  );
}

export const main_interface: Example.Interface = {
  nodes: ["audio-signal", "hls-audio"],
  outputs: {
    playlists: ["1-default"],
    audio: ["hls-audio"],
  },
};
