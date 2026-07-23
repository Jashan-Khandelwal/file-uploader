const { body, validationResult } = require("express-validator");
const prisma = require("../db/prisma");
const storage = require("../storage");

// A folder name: required, trimmed, capped. Same rules for create and rename.
const validateFolder = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Folder name is required.")
    .isLength({ max: 100 })
    .withMessage("Name must be 100 characters or fewer."),
];

// GET /folders — every folder owned by the logged-in user, with a file count.
async function folderList(req, res) {
  const folders = await prisma.folder.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { files: true } } },
  });
  res.render("folders/list", { title: "My Folders", folders });
}

// GET /folders/new — blank create form.
function folderCreateGet(req, res) {
  res.render("folders/form", {
    title: "New Folder",
    folder: { name: "" },
    errors: [],
    formAction: "/folders/new",
  });
}

// POST /folders/new — validate, then insert (or re-show with errors).
const folderCreatePost = [
  ...validateFolder,
  async (req, res, next) => {
    const errors = validationResult(req);
    const { name } = req.body;

    if (!errors.isEmpty()) {
      return res.status(400).render("folders/form", {
        title: "New Folder",
        folder: { name },
        errors: errors.array(),
        formAction: "/folders/new",
      });
    }

    try {
      await prisma.folder.create({ data: { name, userId: req.user.id } });
      res.redirect("/folders");
    } catch (err) {
      // The @@unique([userId, name]) constraint fires here (Prisma code P2002).
      if (err.code === "P2002") {
        return res.status(400).render("folders/form", {
          title: "New Folder",
          folder: { name },
          errors: [{ msg: "You already have a folder with that name." }],
          formAction: "/folders/new",
        });
      }
      next(err);
    }
  },
];

// GET /folders/:id — one folder and the files inside it.
async function folderDetail(req, res) {
  const folder = await prisma.folder.findFirst({
    // findFirst + userId, NOT findUnique by id alone — this is what stops one
    // user from opening another user's folder by guessing the id in the URL.
    where: { id: Number(req.params.id), userId: req.user.id },
    include: {
      files: { orderBy: { uploadedAt: "desc" } },
      shares: {
        where: { expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!folder)
    return res.status(404).render("error", {
      title: "Not found",
      status: 404,
      message: "Folder not found.",
    });

  res.render("folders/detail", { title: folder.name, folder });
}

// GET /folders/:id/edit — rename form, pre-filled.
async function folderUpdateGet(req, res) {
  const folder = await prisma.folder.findFirst({
    where: { id: Number(req.params.id), userId: req.user.id },
  });
  if (!folder)
    return res.status(404).render("error", {
      title: "Not found",
      status: 404,
      message: "Folder not found.",
    });

  res.render("folders/form", {
    title: `Rename ${folder.name}`,
    folder,
    errors: [],
    formAction: `/folders/${folder.id}/edit`,
  });
}

// POST /folders/:id/edit — validate, then rename.
const folderUpdatePost = [
  ...validateFolder,
  async (req, res, next) => {
    const id = Number(req.params.id);
    const { name } = req.body;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).render("folders/form", {
        title: "Rename Folder",
        folder: { id, name },
        errors: errors.array(),
        formAction: `/folders/${id}/edit`,
      });
    }

    try {
      // updateMany with the userId in the WHERE means a mismatched owner
      // simply updates zero rows instead of touching someone else's folder.
      const result = await prisma.folder.updateMany({
        where: { id, userId: req.user.id },
        data: { name },
      });
      if (result.count === 0)
        return res.status(404).render("error", {
          title: "Not found",
          status: 404,
          message: "Folder not found.",
        });
      res.redirect(`/folders/${id}`);
    } catch (err) {
      if (err.code === "P2002") {
        return res.status(400).render("folders/form", {
          title: "Rename Folder",
          folder: { id, name },
          errors: [{ msg: "You already have a folder with that name." }],
          formAction: `/folders/${id}/edit`,
        });
      }
      next(err);
    }
  },
];

// POST /folders/:id/delete — remove the folder. Its files cascade at the DB level.
// async function folderDeletePost(req, res) {
//   const id = Number(req.params.id);
//   // deleteMany scoped to userId: deleting a folder you don't own is a no-op.
//   await prisma.folder.deleteMany({ where: { id, userId: req.user.id } });
//   // NOTE: this drops the file ROWS via cascade, but not bytes on disk.
//   // We'll add disk cleanup once uploads exist (Phase 4).
//   res.redirect("/folders");
// }

async function folderDeletePost(req, res) {
  const id = Number(req.params.id);

  // Grab the storage keys BEFORE the cascade removes the rows.
  const folder = await prisma.folder.findFirst({
    where: { id, userId: req.user.id },
    include: { files: true },
  });
  if (!folder) return res.redirect("/folders");

  await prisma.folder.delete({ where: { id: folder.id } });

  // Now clean the disk. Best-effort — a failed unlink shouldn't 500 the request.
  await Promise.all(folder.files.map((f) => storage.remove(f.storageKey)));

  res.redirect("/folders");
}

module.exports = {
  folderList,
  folderCreateGet,
  folderCreatePost,
  folderDetail,
  folderUpdateGet,
  folderUpdatePost,
  folderDeletePost,
};
