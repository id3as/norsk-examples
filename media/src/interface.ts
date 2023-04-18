import * as cp from "node:child_process";

// An interface for media examples
export type Interface = {
  // Description of the example
  description?: String,
  // Media node ids created by this example
  nodes: String[],
  // Ffmpeg command to run to generate example inputs
  inputs?: FfmpegSpec[],
  // Outputs that this example will create
  outputs: {
    playlists?: String[],
    audio?: String[],
    video?: String[],
  },
};

export type FfmpegSpec = {
  sources?:
  string | string[] // raw bash commandline(s)
  | number // create n sources with default settings
  | SourceSettings // create a source with specific settings
  | (SourceSettings | string | undefined)[], // create n sources with specific settings, commandlines, or defaults
  encode?: string | string[],
  transport: Transport,
  rendered?: string,
  ports?: [number, "tcp" | "udp"][],
  urls?: string[],
};

export type Transport = {
  command: string,
  ports?: [number, "tcp" | "udp"][],
  urls?: string[],
};

export type SourceSettings = {
  resolution?: [number, number],
  framesPerSecond?: number,
  channels?: string,
  src?: string
};

function blankFrame(spec?: { resolution?: [number, number], framesPerSecond?: number }) {
  if (!spec) spec = {};
  if (!spec.resolution) spec.resolution = [1280, 720];
  if (!spec.framesPerSecond) spec.framesPerSecond = 25;
  return `color=c=black:s=${spec.resolution[0]}x${spec.resolution[1]}:r=${spec.framesPerSecond}`;
}
function testCard(spec?: { resolution?: [number, number], framesPerSecond?: number, src?: string }) {
  if (!spec) spec = {};
  if (!spec.resolution) spec.resolution = [1280, 720];
  if (!spec.framesPerSecond) spec.framesPerSecond = 25;
  if (!spec.src) spec.src = "testsrc";
  return spec.src;
}
function silence(spec?: { channels?: string }) {
  if (!spec) spec = {};
  if (!spec.channels) spec.channels = "mono";
  return `anullsrc=cl=${spec.channels}`;
}
let frequencies = [220, 275, 330];
let i = 0;
function sine(spec?: { channels?: string }) {
  if (!spec) spec = {};
  if (!spec.channels) spec.channels = "mono";
  let frequency = frequencies[i++ % frequencies.length] * Math.pow(2, Math.floor(i / frequencies.length));
  return `sine=frequency=${frequency}:sample_rate=48000`;
}

function generate(...filters: string[]) {
  return filters.map((filter, i) => filter + `[out${i}]`).join(";");
}

function getDefaultSource(spec?: SourceSettings) {
  let filters = [testCard(spec), sine(spec)];
  return [
    `-re`, // realtime
    `-f lavfi`, // generate from a filtergraph, not a file
    `-i "${generate(...filters)}"`
  ]
}

export type H264Settings = {
  duration: number;
  framesPerSecond: number;
  videoBitrate: number;
  audioBitrate: number;
  resolution: { width: number, height: number };
  interlaced: boolean;
  audioCodec?: string;
}

export function singleH264AacEncode({ duration, framesPerSecond, videoBitrate, audioBitrate, resolution: { width, height }, interlaced, audioCodec }: H264Settings) {
  let args = [
    `-vcodec h264`,
    `-b:v ${videoBitrate}`,
    `-b:a ${audioBitrate}`,
    `-vf scale=${width}:${height}${interlaced ? ",tinterlace=interleave_top,fieldorder=tff -flags +ildct+ilme" : ""}`,
    `-aspect ${width}:${height}`,
    `-x264opts "keyint=${framesPerSecond}:min-keyint=${framesPerSecond}:no-scenecut:bframes=0${interlaced ? ":interlaced=1" : ""}"`,
    `-bluray-compat true`, // force CFR and some other random things, otherwise ffmpeg always tells libx264 to use VFR
    `-tune stillimage`,
    `-pix_fmt yuv420p`,
    `-acodec ${audioCodec || "aac"}`,
    `-metadata language=en`,
  ];
  return args;
}

type RtmpSettings = {
  port: number;
  app: string;
  str: string;
}

export function rtmpOutput({ port, app, str }: RtmpSettings): Transport {
  let url = `rtmp://${ffmpegTarget()}:${port}/${app}/${str}`;
  return {
    command: `-f flv '${url}'`,
    ports: [[port, "tcp"]],
    urls: [url],
  };
}

type SrtOutput = {
  port: number;
}

export function srtOutput({ port }: SrtOutput): Transport {
  let url = `srt://${ffmpegTarget()}:${port}`;
  return {
    command: `-f mpegts -flush_packets 0 '${url}'`,
    ports: [[port, "udp"]],
    urls: [url],
  };
}

type RtpOutput = {
  port: number;
}

export function rtpOutput({ port }: RtpOutput): Transport {
  let url = `rtp://${ffmpegTarget()}:${port}`;
  return {
    command: `-f rtp '${url}'`,
    ports: [[port, "udp"]],
    urls: [url],
  };
}

function cat(value: string | string[]) {
  return typeof value === 'string' ? value : value.join(" ");
}

function ffmpegTarget(): string {
  if (process.env.FFMPEG_TARGET)
    return process.env.FFMPEG_TARGET;
  return "127.0.0.1";
}

export let defaultEncode: H264Settings = {
  duration: 20.0 * 60.0,
  framesPerSecond: 25,
  videoBitrate: 150000,
  audioBitrate: 5000,
  resolution: { width: 1280, height: 720 },
  interlaced: false
};

export function sourceCommand(sources: FfmpegSpec["sources"]) {
  if (sources === undefined) {
    sources = 1;
  }
  let source_specs: (SourceSettings | string | undefined)[] = [];
  if (typeof sources === "number") {
    for (let i = 0; i < sources; i++) {
      source_specs.push(undefined);
    }
  } else if (!Array.isArray(sources)) {
    source_specs = [sources];
  } else {
    source_specs = sources;
  }
  return source_specs.flatMap(v => {
    if (typeof v === "string") {
      return [v];
    }
    return getDefaultSource(v);
  });
}

export function ffmpegCommand(specOrTransportSpec: FfmpegSpec | Transport): FfmpegSpec {
  let spec = specOrTransportSpec;
  if (!("transport" in spec)) spec = { transport: spec };
  if (!spec.ports) spec.ports = [];
  if (spec.transport.ports) {
    for (let port of spec.transport.ports) {
      if (!spec.ports.includes(port)) {
        spec.ports.push(port);
      }
    }
  }
  if (!spec.urls) spec.urls = [];
  if (spec.transport.urls) {
    for (let url of spec.transport.urls) {
      if (!spec.urls.includes(url)) {
        spec.urls.push(url);
      }
    }
  }

  spec.rendered = render(spec);

  return spec;
}

export function ffmpegExecutable(): string {
  let errorsOnly = " -v error";
  if (process.env.FFMPEG)
    return process.env.FFMPEG + errorsOnly
  if (process.env.FFMPEG_FULL)
    return process.env.FFMPEG_FULL + "/bin/ffmpeg" + errorsOnly;
  return "ffmpeg" + errorsOnly;
}

export function render(spec: FfmpegSpec): string {
  let sources = sourceCommand(spec.sources);

  if (spec.encode === undefined) {
    spec.encode = singleH264AacEncode(defaultEncode);
  }

  return cat([ffmpegExecutable(), cat(sources), cat(spec.encode), cat(spec.transport.command)]);
}

export async function main(main: () => Promise<void>, iface?: Interface) {
  console.log("Starting client code for example");
  await main();
  if (iface?.inputs?.length) {
    console.log("Starting ffmpeg");
    for (let { rendered } of iface.inputs) {
      if (!rendered) continue;
      console.log(rendered);
      let spawned = cp.exec(rendered);
      spawned.stdout?.pipe(process.stdout);
      spawned.stderr?.pipe(process.stderr);
    }
  }
}
