const { Router } = require("express");
const fileController = require("../controllers/fileController");
const { isAuth } = require("../middleware/auth");

const fileRouter = Router();
fileRouter.use(isAuth);

fileRouter.get("/:id", fileController.fileDetail);
fileRouter.get("/:id/download", fileController.fileDownload);
fileRouter.post("/:id/delete", fileController.fileDeletePost);

module.exports = fileRouter;
