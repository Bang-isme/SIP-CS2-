import { Router } from "express";
import {
  signinHandler,
  signupHandler,
  logoutHandler,
  meHandler,
  refreshHandler,
  sessionStatusHandler,
} from "../controllers/auth.controller.js";
import {
  checkExistingUser,
  checkExistingRole,
} from "../middlewares/verifySignup.js";
import { verifyToken } from "../middlewares/authJwt.js";
import { authRateLimiter, authRefreshRateLimiter, readApiRateLimiter } from "../middlewares/rateLimit.js";

const router = Router();
const LOGOUT_ALIAS_SUNSET = "Wed, 01 Jul 2026 00:00:00 GMT";

router.use((req, res, next) => {
  res.header(
    "Access-Control-Allow-Headers",
    "x-access-token, Origin, Content-Type, Accept"
  );
  next();
});

router.post("/signup", authRateLimiter, [checkExistingUser, checkExistingRole], signupHandler);
router.post("/signin", authRateLimiter, signinHandler);
router.get("/session", readApiRateLimiter, sessionStatusHandler);
router.post("/refresh", authRefreshRateLimiter, refreshHandler);
router.get("/logout", [verifyToken, readApiRateLimiter], (req, res, next) => {
  res.setHeader("Deprecation", "true");
  res.setHeader("Sunset", LOGOUT_ALIAS_SUNSET);
  res.setHeader("Link", '</api/contracts/openapi.json>; rel="describedby"');
  next();
}, logoutHandler);
router.post("/logout", [verifyToken, readApiRateLimiter], logoutHandler);
router.get("/me", [verifyToken, readApiRateLimiter], meHandler);
export default router;
