require("dotenv").config();
const path = require("node:path");
const express = require("express");
const session = require("express-session");
const { PrismaSessionStore } = require("@quixo3/prisma-session-store");

const prisma = require("./db/prisma");
const passport = require("./config/passport");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Sessions persist in Postgres via the Session model, so restarts don't log everyone out.
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 1 day
    store: new PrismaSessionStore(prisma, {
      checkPeriod: 2 * 60 * 1000, // prune expired sessions every 2 minutes
      dbRecordIdIsSessionId: true,
    }),
  }),
);

app.use(passport.initialize());
app.use(passport.session());

// Make the logged-in user available to every template without passing it each render.
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.baseUrl = `${req.protocol}://${req.get("host")}`;  // add this
  next();
});

app.use("/", require("./routes/authRouter"));
app.use("/folders", require("./routes/folderRouter"));

app.get("/", (req, res) => {
  res.render("index", { title: "File Uploader" });
});

app.use("/files", require("./routes/fileRouter"));

app.use("/share", require("./routes/shareRouter"));

app.use((req, res) => {
  res
    .status(404)
    .render("error", {
      title: "Not found",
      status: 404,
      message: "That page doesn't exist.",
    });
});

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).render("error", {
    title: "Error",
    status,
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong."
        : err.message,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`File Uploader listening on http://localhost:${PORT}`),
);
