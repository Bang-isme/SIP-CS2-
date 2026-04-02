import { Router } from "express";
import {
  getProducts,
  createProduct,
  updateProductById,
  deleteProductById,
  getProductById,
  searchProduct
} from "../controllers/products.controller.js";
import { verifyToken, canManageProducts, isAdmin } from "../middlewares/authJwt.js";

const router = Router();

router.use(verifyToken);

router.get("/", getProducts);
router.get("/search/:productName", searchProduct);
router.post("/", canManageProducts, createProduct);
router
  .route("/:productId")
  .get(getProductById)
  .put(canManageProducts, updateProductById)
  .delete(isAdmin, deleteProductById);

export default router;
