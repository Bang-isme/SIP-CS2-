import { Router } from "express";
import pkg from "../../package.json" with { type: "json" };

export const createServiceInfoRouter = ({
  key = "combined",
  name = "SIP_CS Backend",
  description = pkg.description,
  responsibilities = [],
  routePrefixes = [],
  ui = null,
} = {}) => {
  const router = Router();

  router.get("/", (req, res) => {
    res.json({
      message: `Welcome to the ${name}`,
      name: pkg.name,
      version: pkg.version,
      description,
      author: pkg.author,
      service: {
        key,
        name,
        port: req.app.get("port"),
        routePrefixes,
        responsibilities,
        ui,
      },
    });
  });

  return router;
};

export default createServiceInfoRouter;
