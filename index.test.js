#!/usr/bin/env node

import { createReadStream, createWriteStream, rmSync, statSync } from "node:fs";
import { Readable, Writable } from "node:stream";
import Zipper from "./index.js";

const OUTFILE = "./out.zip";

const zip = new Zipper();

zip
  .add({
    name: "empty.txt",
    data: Readable.toWeb(createReadStream("./empty.txt")),
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

if (!process.env.CI) {
  const largeFileStats = statSync("./large-file.bin")
  zip.add({
    name: "large-file.bin",
    data: Readable.toWeb(createReadStream("./large-file.bin")),
    lastModified: largeFileStats.mtime,
    size: largeFileStats.size,
  })
}

const licenseStats = statSync("./LICENSE")
zip.add({
  name: "LICENSE",
  data: Readable.toWeb(createReadStream("./LICENSE")),
  lastModified: licenseStats.mtime,
  size: licenseStats.size,
})

if (!process.env.CI) {
  const oneGBFileStats = statSync("./1gb-file.bin")
  for (let i = 0; i < 4; i++) {
    zip.add({
      name: `1gb-file-${i}.bin`,
      data: Readable.toWeb(createReadStream("./1gb-file.bin")),
      lastModified: oneGBFileStats.mtime,
      size: oneGBFileStats.size,
    })
  }
}

// Can be done before streaming the file
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
    if (process.env.CI) {
      try { rmSync(OUTFILE, { force: true }) } catch { }
    }
  });
