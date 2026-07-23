const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const prisma = require("../db/prisma");

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { username } });

      // Same message for both cases — telling an attacker which half was
      // wrong lets them enumerate valid usernames.
      if (!user) return done(null, false, { message: "Incorrect username or password." });

      const match = await bcrypt.compare(password, user.password);
      if (!match) return done(null, false, { message: "Incorrect username or password." });

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

// Only the id goes into the session cookie; everything else is looked up per request.
passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
