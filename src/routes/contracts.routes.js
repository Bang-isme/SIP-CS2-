import express, { Router } from "express";
import swaggerUiDist from "swagger-ui-dist";
import {
  getOpenApiContract,
  getOpenApiDocsInitializer,
  getOpenApiDocsPage,
} from "../controllers/contracts.controller.js";

const router = Router();
const swaggerUiAssetPath = swaggerUiDist.getAbsoluteFSPath();

router.get("/openapi.json", getOpenApiContract);
router.get("/docs", (req, res, next) => {
  if (req.originalUrl.endsWith("/docs/")) {
    return next();
  }

  return res.redirect(302, `${req.baseUrl}/docs/`);
});
router.use("/docs/assets", express.static(swaggerUiAssetPath));
router.get("/docs/swagger-initializer.js", getOpenApiDocsInitializer);
router.get("/docs/", getOpenApiDocsPage);

export default router;
