import { describe, expect, it } from "vitest";

import Zipper from "../../src/index";
import { Zip64EndOfCentralDirectoryLocator } from "./Zip64EndOfCentralDirectoryLocator";

describe("ZIP64 End of Central Directory Locator", () => {
  it("should generate correct ZIP64 EOCD Locator structure", () => {
    const zipper = new Zipper();

    const locatorBuffer = zipper.generateZip64EndOfCentralDirectoryLocator(
      2000,
      1000,
    );
    const locator = new Zip64EndOfCentralDirectoryLocator(locatorBuffer.buffer);

    expect(locator.signature).toBe(Zip64EndOfCentralDirectoryLocator.SIGNATURE);
    expect(locator.eocd64Disk).toBe(0); // Disk number
    expect(locator.eocd64Offset).toBe(3000); // Disk number
    expect(locator.totalDisks).toBe(1);
  });
});
