const auth = require("../auth");
const { fromNodeHeaders } = require("better-auth/node");

async function requireAuth(req, res, next) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session || !session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    req.user = session.user;
    req.session = session.session;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(401).json({ error: "Not authenticated" });
  }
}

module.exports = requireAuth;
