import {
  AudioMatrixMixerSettings,
  AudioMatrixMixerSettingsUpdate,
  ChannelName,
  HlsAudioOutputSettings,
  newSilentMatrix,
  Norsk,
  RtpInputSettings,
  selectAudio,
} from "@id3as/norsk-sdk";

import * as Example from "../interface";

export async function main() {
  const norsk = new Norsk({
    onShutdown: () => {
      console.log("Norsk has shutdown");
      process.exit(1)
    }
  });

  let rtpInput: RtpInputSettings = {
    id: "rtp",
    onError: (err) => console.log("RTP INGEST ERR", err),
    sourceName: "rtp1",
    streams: [
      {
        ip: "127.0.0.1",
        rtpPort: 5001,
        rtcpPort: 5002,
        iface: "any",
        streamId: 1,
        streamType: {
          kind: "linearpcm",
          bitDepth: 24,
          sampleRate: 48000,
          channelLayout: "5.1",
        },
      },
    ],
  };
  let input = await norsk.input.rtp(rtpInput);

  // Matrix mixer, downmix a 5.1 layout to stereo
  let channelGains = [
    [0.0, null, -6.0, null, -9.0, null],
    [null, 0.0, null, -6.0, null, -9.0],
  ];
  let matrixMixerSettings: AudioMatrixMixerSettings = {
    id: "mixer",
    outputChannelLayout: "stereo",
    channelGains,
  };

  let matrixMixer = await norsk.processor.transform.audioMatrixMixer(
    matrixMixerSettings
  );
  matrixMixer.subscribe([{ source: input, sourceSelector: selectAudio }]);


  // HLS out
  let delayOutputMs = 500.0;
  let audio: HlsAudioOutputSettings = {
    onError: (err) => console.log("HLS AUDIO ERR", err),
    id: "hls-audio",
    partDurationSeconds: 1.0,
    segmentDurationSeconds: 4.0,
    delayOutputMs,
  };
  let audioOutput = await norsk.output.hlsAudio(audio);
  audioOutput.subscribe([{ source: matrixMixer, sourceSelector: selectAudio }]);
  console.log(
    "Media playlist",
    "http://localhost:8080/localHls/file/stream/1-default/playlist.m3u8"
  );

  // Update gains every 3s
  let wasPreviousLeft = true;
  setInterval(function () {
    let newMixerConfig: AudioMatrixMixerSettingsUpdate;
    if (wasPreviousLeft) {
      let newChannelGains = newSilentMatrix(2, 6);
      newChannelGains[0][1] = 0.0;
      newChannelGains[1][0] = 0.0;
      newMixerConfig = { channelGains: newChannelGains };
      wasPreviousLeft = false;
    } else {
      let newChannelGains = newSilentMatrix(2, 6);
      newChannelGains[0][0] = 0.0;
      newChannelGains[1][1] = 0.0;
      newMixerConfig = { channelGains: newChannelGains };
      wasPreviousLeft = true;
    }
    console.log("Apply mixer config:", newMixerConfig);
    matrixMixer.updateConfig(newMixerConfig);
  }, 3000);
}

export const main_interface: Example.Interface = {
  nodes: ["rtp", "mixer", "hls-audio"],
  inputs: [Example.ffmpegCommand({
    sources: 6,
    encode: `-filter_complex "[0:a][1:a][2:a][3:a][4:a][5:a]join=inputs=6:channel_layout=5.1:map=0.0-FL|1.0-FR|2.0-FC|3.0-LFE|4.0-BL|5.0-BR[a]" -map "[a]" -c:a pcm_s24be`,
    transport: Example.rtpOutput({ port: 5001 })
  })],
  outputs: {
    audio: ["hls-audio"],
    video: [],
  },
};
