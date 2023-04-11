import * as lib from "@id3as/norsk-manager-lib";

function baseUrl(): string {
  return `localhost:${process.env.PORT}`;
}

async function main() {
  const manager = new lib.AutoManager({
    url: baseUrl(),
    pendingWindow: 3600,
    primaryRegionPreferences: new Map<lib.RegionGroupName, lib.AwsRegion[]>([
      ["us", ["us-east-1", "us-west-1", "eu-west-1"]],
      ["europe", ["eu-west-1", "eu-west-2", "us-east-1"]],
    ]),
    backupRegionPreferences: new Map<lib.RegionGroupName, lib.AwsRegion[]>([
      ["us", ["us-east-1", "us-west-1", "eu-west-1"]],
      ["europe", ["eu-west-1", "eu-west-2", "us-east-1"]],
    ]),
    onStarting: (job) => {
      console.log("Job starting!");
    },
    onStarted: (job) => {
      console.log("Job started!");
    },
    onStopped: (job) => {
      console.log("Job stopped!");
    },
    onFailed: (job) => {
      console.log("Job failed!");
    },
  });

  let job: lib.Job = {
    id: "001",
    description: "A job",
    mediaConfiguration: JSON.stringify({ sample: "data", value: [1, 2, 3] }),
    tags: new Map(),
    startDateTime: new Date(),
    endDateTime: new Date(2030, 1, 1),
    regionGroupName: "us",
    repeats: "never",
    autoAllocateBackup: false,
    norskMediaVersion: "v123-master",
    clientCode: {
      codeType: "docker",
      location: { locationType: "awsS3", url: "s3://foo/bar" },
    },
  };

  let result = await manager.createJob(job);
}
