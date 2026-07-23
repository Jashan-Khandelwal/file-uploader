// The ONLY module that knows files live on local disk. Everything else calls
// these functions. Swapping to Cloudinary in Phase 5 means rewriting just this file.
// const path = require("node:path");
// const fs = require("node:fs/promises");

// const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

// // Absolute path to a stored file, from its storageKey (the on-disk filename).
// function resolvePath(storageKey) {
//   return path.join(UPLOAD_DIR, storageKey);
// }

// // Delete a stored file. Never throw if it's already gone — cleanup is best-effort.
// async function remove(storageKey) {
//   try {
//     await fs.unlink(resolvePath(storageKey));
//   } catch (err) {
//     if (err.code !== "ENOENT") throw err;
//   }
// }

// module.exports = { UPLOAD_DIR, resolvePath, remove };

// The ONLY module that knows where bytes physically live. Phase 4 = local disk,
// Phase 5 = Cloudinary. Nothing outside this file changed to make that switch.
const path = require("node:path");
const crypto = require("node:crypto");
const { Readable } = require("node:stream");
const { v2: cloudinary } = require("cloudinary");

// Reads CLOUDINARY_URL from the environment automatically. secure:true = https URLs.
cloudinary.config({ secure: true });

// Upload a buffer to Cloudinary. Returns the pointer we store in the DB.
// resource_type:"raw" = "store any file as-is" (pdf, zip, docx, images alike),
// which keeps delete/download uniform — no per-type branching.
function save(buffer, originalName) {
  const ext = path.extname(originalName);
  // Random id + real extension → no collisions, unguessable, right content-type.
  const publicId = `file_uploader/${crypto.randomUUID()}${ext}`;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: "raw", public_id: publicId },
      (err, result) => {
        if (err) return reject(err);
        resolve({ storageKey: result.public_id, url: result.secure_url });
      },
    );
    // multer gave us the file as a buffer (memory); turn it into a stream to pipe up.
    Readable.from(buffer).pipe(uploadStream);
  });
}

// A URL that forces the browser to DOWNLOAD (not display) under the original name.
function downloadUrl(file) {
  const baseName = path.parse(file.name).name; // "beach.jpg" -> "beach"
  return cloudinary.url(file.storageKey, {
    resource_type: "raw",
    flags: `attachment:${encodeURIComponent(baseName)}`,
    secure: true,
  });
}

// Delete the remote file. Best-effort: a missing file shouldn't crash the request.
async function remove(storageKey) {
  try {
    await cloudinary.uploader.destroy(storageKey, { resource_type: "raw" });
  } catch (err) {
    console.error("Cloudinary delete failed:", err.message);
  }
}

module.exports = { save, downloadUrl, remove };
