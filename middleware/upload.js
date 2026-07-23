const { upload } = require("../config/multer");

// Run multer for a single "file" field, translating its errors into a friendly page
// instead of a raw 500. LIMIT_FILE_SIZE fires when the file exceeds MAX_BYTES.
function uploadSingle(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (!err) return next();

    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "That file is too large (max 10 MB)."
        : err.field || err.message || "Upload failed.";

    res
      .status(400)
      .render("error", { title: "Upload failed", status: 400, message });
  });
}

module.exports = { uploadSingle };
