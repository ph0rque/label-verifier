import "@testing-library/jest-dom";

if (typeof global.FormData === "undefined") {
  global.FormData = require("formdata-node").FormData as unknown as typeof FormData;
}

if (typeof global.File === "undefined") {
  global.File = require("fetch-blob/file.js").File as unknown as typeof File;
}

if (typeof global.Blob === "undefined") {
  global.Blob = require("fetch-blob").Blob as unknown as typeof Blob;
}
