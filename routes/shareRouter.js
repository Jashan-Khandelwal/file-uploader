const { Router } = require("express");
const shareController = require("../controllers/shareController");

const shareRouter = Router();

shareRouter.get("/:token", shareController.sharedFolder);
shareRouter.get(
  "/:token/files/:fileId/download",
  shareController.sharedDownload,
);

module.exports = shareRouter;
