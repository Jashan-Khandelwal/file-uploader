const bcrypt = require("bcryptjs");
const passport = require("passport");
const { body, validationResult } = require("express-validator");
const prisma = require("../db/prisma");

const validateSignup = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage("Username must be 3–30 characters.")
    .custom(async (username) => {
      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing) throw new Error("That username is taken.");
    }),
  body("password")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters."),
  body("confirmPassword")
    .custom((value, { req }) => value === req.body.password)
    .withMessage("Passwords do not match."),
];

function signupGet(req, res) {
  res.render("signup", { title: "Sign up", errors: [], username: "" });
}

const signupPost = [
  ...validateSignup,
  async (req, res, next) => {
    const errors = validationResult(req);
    const { username, password } = req.body;

    if (!errors.isEmpty()) {
      return res.status(400).render("signup", {
        title: "Sign up",
        errors: errors.array(),
        username,
      });
    }

    try {
      const hashed = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({ data: { username, password: hashed } });

      // Log them straight in rather than bouncing to the login form.
      req.login(user, (err) => (err ? next(err) : res.redirect("/")));
    } catch (err) {
      next(err);
    }
  },
];

function loginGet(req, res) {
  res.render("login", { title: "Log in", errors: [] });
}

function loginPost(req, res, next) {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).render("login", {
        title: "Log in",
        errors: [{ msg: info?.message || "Login failed." }],
      });
    }
    req.login(user, (loginErr) => (loginErr ? next(loginErr) : res.redirect("/")));
  })(req, res, next);
}

function logoutPost(req, res, next) {
  req.logout((err) => (err ? next(err) : res.redirect("/")));
}

module.exports = { signupGet, signupPost, loginGet, loginPost, logoutPost };
