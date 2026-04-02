import { Router } from "express";
import {
  signinHandler,
  signupHandler,
  logoutHandler,
  meHandler,
} from "../controllers/auth.controller.js";
import {
  checkExistingUser,
} from "../middlewares/verifySignup.js";
import { verifyToken } from "../middlewares/authJwt.js";

const router = Router();
const LOGOUT_ALIAS_SUNSET = "Wed, 01 Jul 2026 00:00:00 GMT";

router.use((req, res, next) => {
  res.header(
    "Access-Control-Allow-Headers",
    "x-access-token, Origin, Content-Type, Accept"
  );
  next();
});

router.post("/signup", [checkExistingUser], signupHandler);
router.post("/signin", signinHandler);
router.get("/logout", [verifyToken], (req, res, next) => {
  res.setHeader("Deprecation", "true");
  res.setHeader("Sunset", LOGOUT_ALIAS_SUNSET);
  res.setHeader("Link", '</api/contracts/openapi.json>; rel="describedby"');
  next();
}, logoutHandler);
router.post("/logout", [verifyToken], logoutHandler);
router.get("/me", [verifyToken], meHandler);
export default router;
