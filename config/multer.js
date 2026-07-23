// const path = require("node:path");
// const crypto = require("node:crypto");
// const fs = require("node:fs");
// const multer = require("multer");
// const { UPLOAD_DIR } = require("../storage");

// // Ensure the upload directory exists at boot (sync is fine — runs once).
// fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// // What we're willing to accept. Tighten or widen as you like.
// const ALLOWED_MIME = new Set([
//   "image/jpeg",
//   "image/png",
//   "image/gif",
//   "image/webp",
//   "application/pdf",
//   "text/plain",
//   "application/zip",
//   "application/msword",
//   "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
// ]);

// const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, UPLOAD_DIR),
//   filename: (req, file, cb) => {
//     // Random name so two "report.pdf" uploads never collide, and so a user
//     // can't guess another file's storageKey. Keep the real extension.
//     const ext = path.extname(file.originalname);
//     cb(null, `${crypto.randomUUID()}${ext}`);
//   },
// });

// function fileFilter(req, file, cb) {
//   if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
//   // Reject with a message our error handler can show.
//   cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Unsupported file type."));
// }

// const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_BYTES } });

// module.exports = { upload, MAX_BYTES, ALLOWED_MIME };

const multer = require("multer");

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB (Cloudinary free-tier raw limit too)

// Keep the upload in RAM as req.file.buffer instead of writing to disk.
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
  cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Unsupported file type."));
}

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_BYTES } });

module.exports = { upload, MAX_BYTES, ALLOWED_MIME };
