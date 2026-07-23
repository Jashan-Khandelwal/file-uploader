const { Router } = require("express");
const folderController = require("../controllers/folderController");
const fileController = require("../controllers/fileController");
const { isAuth } = require("../middleware/auth");
const { uploadSingle } = require("../middleware/upload");
const shareController = require("../controllers/shareController");

const folderRouter = Router();

// Every folder route requires a logged-in user.
folderRouter.use(isAuth);

folderRouter.get("/", folderController.folderList);

// "/new" must be declared before "/:id", or Express treats "new" as an id.
folderRouter.get("/new", folderController.folderCreateGet);
folderRouter.post("/new", folderController.folderCreatePost);

folderRouter.get("/:id", folderController.folderDetail);

folderRouter.get("/:id/edit", folderController.folderUpdateGet);
folderRouter.post("/:id/edit", folderController.folderUpdatePost);

folderRouter.post("/:id/delete", folderController.folderDeletePost);

folderRouter.post("/:id/share", shareController.createShare);
folderRouter.post("/:id/shares/:shareId/delete", shareController.revokeShare);

// Upload into a folder: ownership check → multer → create row.
folderRouter.post(
  "/:id/upload",
  fileController.loadOwnedFolder,
  uploadSingle,
  fileController.uploadPost,
);

module.exports = folderRouter;
