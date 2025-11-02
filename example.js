#!/usr/bin/env node

import { createReadStream, createWriteStream, rmSync, statSync } from "node:fs";
import { Readable, Writable } from "node:stream";
import Zipper from "./src/index.js";

const OUTFILE = "./out.zip";

const zip = new Zipper();

zip
  .add({ name: "empty.txt" }, new Blob([new Uint8Array(0)]).stream(), 0)
  .add({ name: "empty_buf.txt" }, new Uint8Array(0));

const textEncoder = new TextEncoder();

const text = textEncoder.encode(
  "You should be able to open this text file inside the zip!",
);
zip.add({ name: "this is a test.txt" }, text);

const moreText = new Blob(["Here is some more text in another location"]);
zip.add({ name: "this/is/another/test.txt" }, moreText.stream(), moreText.size);

for (let i = 0; i < 0xffff; i++) {
  const textBuf = textEncoder.encode(`This is test file number ${i}`);
  zip.add({ name: `/many/test-${i}.txt` }, textBuf);
}

const licenseStats = statSync("./LICENSE");
zip.add(
  { name: "LICENSE", mTime: licenseStats.mtime },
  /** @type {ReadableStream<Uint8Array>} */ (
    Readable.toWeb(createReadStream("./LICENSE"))
  ),
  licenseStats.size,
);

const predictedSize = zip.predictSize();

rmSync(OUTFILE, { force: true });

const outStream = Writable.toWeb(
  createWriteStream(OUTFILE, { encoding: "binary" }),
);

await zip
  .stream()
  .pipeTo(outStream)
  .catch((err) => console.error("Error while generating zip file: ", err))
  .then(() => {
    const { size: actualSize } = statSync(OUTFILE);
    console.log(
      `Predicted size is ${predictedSize}. Actual size is ${actualSize}`,
    );
    if (predictedSize === actualSize) {
      console.log("🎉 We correctly predicted the zips final size");
    } else {
      console.error("😒 The zips final size does not match the prediction");
      console.error(
        `The difference between the two is ${predictedSize - actualSize} bytes`,
      );
    }
  });
