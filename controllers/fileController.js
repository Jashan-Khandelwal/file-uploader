const prisma = require("../db/prisma");
const storage = require("../storage");

// Middleware: load the folder from the URL and confirm the user owns it.
// Runs BEFORE multer so we never accept bytes for a folder that isn't theirs.
async function loadOwnedFolder(req, res, next) {
  const folder = await prisma.folder.findFirst({
    where: { id: Number(req.params.id), userId: req.user.id },
  });
  if (!folder)
    return res.status(404).render("error", {
      title: "Not found",
      status: 404,
      message: "Folder not found.",
    });
  req.folder = folder;
  next();
}

// POST /folders/:id/upload — multer has already saved the file to disk by now.
// async function uploadPost(req, res) {
//   if (!req.file) {
//     return res.status(400).render("error", {
//       title: "No file",
//       status: 400,
//       message: "Please choose a file to upload.",
//     });
//   }

//   await prisma.file.create({
//     data: {
//       name: req.file.originalname, // what the user sees
//       size: req.file.size,
//       mimeType: req.file.mimetype,
//       storageKey: req.file.filename, // the random on-disk name
//       url: null, // stays null until Cloudinary (Phase 5)
//       folderId: req.folder.id,
//       userId: req.user.id,
//     },
//   });

//   res.redirect(`/folders/${req.folder.id}`);
// }
async function uploadPost(req, res, next) {
  if (!req.file) {
    return res.status(400).render("error", {
      title: "No file",
      status: 400,
      message: "Please choose a file to upload.",
    });
  }

  try {
    // Push the bytes to Cloudinary; get back the pointer + public URL.
    const { storageKey, url } = await storage.save(
      req.file.buffer,
      req.file.originalname,
    );

    await prisma.file.create({
      data: {
        name: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        storageKey, // Cloudinary public_id
        url, // public https URL — the thing the assignment asks us to save
        folderId: req.folder.id,
        userId: req.user.id,
      },
    });

    res.redirect(`/folders/${req.folder.id}`);
  } catch (err) {
    next(err); // upload failed — let the global handler show an error page
  }
}

// GET /files/:id — details page.
async function fileDetail(req, res) {
  const file = await prisma.file.findFirst({
    where: { id: Number(req.params.id), userId: req.user.id },
    include: { folder: true },
  });
  if (!file)
    return res.status(404).render("error", {
      title: "Not found",
      status: 404,
      message: "File not found.",
    });
  res.render("files/detail", { title: file.name, file });
}

// GET /files/:id/download — stream the bytes back as an attachment.
// async function fileDownload(req, res, next) {
//   const file = await prisma.file.findFirst({
//     where: { id: Number(req.params.id), userId: req.user.id },
//   });
//   if (!file)
//     return res.status(404).render("error", {
//       title: "Not found",
//       status: 404,
//       message: "File not found.",
//     });

//   // res.download sets Content-Disposition so the browser saves it under the
//   // ORIGINAL name, even though on disk it's a random uuid.
//   res.download(storage.resolvePath(file.storageKey), file.name, (err) => {
//     if (err && !res.headersSent) next(err);
//   });
// }
async function fileDownload(req, res) {
  const file = await prisma.file.findFirst({
    where: { id: Number(req.params.id), userId: req.user.id },
  });
  if (!file)
    return res.status(404).render("error", {
      title: "Not found",
      status: 404,
      message: "File not found.",
    });

  // The bytes live on Cloudinary now — send the browser there with a
  // download-forcing URL, instead of streaming from our disk.
  res.redirect(storage.downloadUrl(file));
}

// POST /files/:id/delete — remove the row AND the bytes on disk.
async function fileDeletePost(req, res) {
  const file = await prisma.file.findFirst({
    where: { id: Number(req.params.id), userId: req.user.id },
  });
  if (!file)
    return res.status(404).render("error", {
      title: "Not found",
      status: 404,
      message: "File not found.",
    });

  await prisma.file.delete({ where: { id: file.id } });
  await storage.remove(file.storageKey); // best-effort disk cleanup
  res.redirect(`/folders/${file.folderId}`);
}

module.exports = {
  loadOwnedFolder,
  uploadPost,
  fileDetail,
  fileDownload,
  fileDeletePost,
};
