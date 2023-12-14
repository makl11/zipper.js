#!/usr/bin/env node

import { createReadStream, createWriteStream, rmSync, statSync } from "node:fs";
import { Readable, Writable } from "node:stream";
import Zipper from "./index.js";

const OUTFILE = "./out.zip";

const zip = new Zipper();

const text = new TextEncoder().encode(
  "You should be able to open this text file inside the zip!"
);
zip.add({
  name: "this is a test.txt",
  data: text,
  lastModified: new Date(Date.now()),
  size: text.byteLength,
});

const moreText = new Blob([
  "Here is some more text in another location"
]);
zip.add({
  name: "this/is/another/test.txt",
  data: moreText.stream(),
  lastModified: new Date(Date.now()),
  size: moreText.size,
});

const index_jsStats = statSync("./index.js")
zip.add({
  name: "index.js",
  data: Readable.toWeb(createReadStream("./index.js")),
  lastModified: index_jsStats.mtime,
  size: index_jsStats.size,
})

// Can be done before streaming the file
const predictedSize = zip.predictSize();

const zipStream = zip.stream();

try {
  rmSync(OUTFILE, { force: true });
} catch {}

const outStream = Writable.toWeb(
  createWriteStream(OUTFILE, { encoding: "binary" })
);

zipStream.pipeTo(outStream).finally(() => {
  const { size: actualSize } = statSync(OUTFILE);
  console.log(
    `Predicted size is ${predictedSize}. Actual size is ${actualSize}`
  );
  if (predictedSize === actualSize) {
    console.log("🎉 We correctly predicted the zips final size");
  } else {
    throw "😒 The zips final size does not match the prediction";
  }
});
