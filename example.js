#!/usr/bin/env node

import { createReadStream, createWriteStream, rmSync, statSync } from "node:fs";
import { Readable, Writable } from "node:stream";
import Zipper from "./index.js";

const OUTFILE = "./out.zip";

const zip = new Zipper();

zip
  .add({
    name: "empty.txt",
    data: new Blob([new Uint8Array(0)]).stream(),
    lastModified: new Date(0),
    size: 0,
  })
  .add({
    name: "empty_buf.txt",
    data: new Uint8Array(0),
    lastModified: new Date(0),
    size: 0,
  });

const textEncoder = new TextEncoder()

const text = textEncoder.encode(
  "You should be able to open this text file inside the zip!"
);
zip.add({
  name: "this is a test.txt",
  data: text,
  lastModified: new Date(0),
  size: text.byteLength,
});

const moreText = new Blob([
  "Here is some more text in another location"
]);
zip.add({
  name: "this/is/another/test.txt",
  data: moreText.stream(),
  lastModified: new Date(0),
  size: moreText.size,
});

for (let i = 0; i < 0xFFFF; i++) {
  const textBuf = textEncoder.encode(`This is test file number ${i}`)
  zip.add({
    name: `/many/test-${i}.txt`,
    data: textBuf,
    lastModified: new Date(0),
    size: textBuf.byteLength,
  })
}

const licenseStats = statSync("./LICENSE")
zip.add({
  name: "LICENSE",
  data: /** @type {ReadableStream<Uint8Array>} */(Readable.toWeb(createReadStream("./LICENSE"))),
  lastModified: licenseStats.mtime,
  size: licenseStats.size,
})

const predictedSize = zip.predictSize();

try {
  rmSync(OUTFILE, { force: true });
} catch { }

const outStream = Writable.toWeb(
  createWriteStream(OUTFILE, { encoding: "binary" })
);

zip.stream()
  .pipeTo(outStream)
  .catch((err) => console.error("Error while generating zip file: ", err))
  .then(() => {
    const { size: actualSize } = statSync(OUTFILE);
    console.log(
      `Predicted size is ${predictedSize}. Actual size is ${actualSize}`
    );
    if (predictedSize === actualSize) {
      console.log("🎉 We correctly predicted the zips final size");
    } else {
      console.error("😒 The zips final size does not match the prediction");
      console.error(`The difference between the two is ${predictedSize - actualSize} bytes`);
    }
  });
