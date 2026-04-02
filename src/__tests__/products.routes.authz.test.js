import express from "express";
import request from "supertest";
import { jest } from "@jest/globals";

const createProduct = jest.fn((req, res) => res.status(201).json({ success: true, actor: req.userId }));
const getProducts = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId, data: [] }));
const getProductById = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId }));
const updateProductById = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId }));
const deleteProductById = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId }));
const searchProduct = jest.fn((req, res) => res.status(200).json({ success: true, actor: req.userId, data: [] }));

jest.unstable_mockModule("../controllers/products.controller.js", () => ({
  createProduct,
  getProducts,
  getProductById,
  updateProductById,
  deleteProductById,
  searchProduct,
}));

jest.unstable_mockModule("../middlewares/authJwt.js", () => ({
  verifyToken: (req, res, next) => {
    const token = req.headers["x-access-token"];
    if (!token) return res.status(403).json({ message: "No token provided" });
    if (token === "admin-token") {
      req.userId = "admin-user-id";
      req.roleNames = ["admin"];
      return next();
    }
    if (token === "moderator-token") {
      req.userId = "moderator-user-id";
      req.roleNames = ["moderator"];
      return next();
    }
    if (token === "user-token") {
      req.userId = "normal-user-id";
      req.roleNames = ["user"];
      return next();
    }
    return res.status(401).json({ message: "Unauthorized!" });
  },
  canManageProducts: (req, res, next) => {
    const roles = req.roleNames || [];
    if (roles.includes("moderator") || roles.includes("admin") || roles.includes("super_admin")) {
      return next();
    }
    return res.status(403).json({ message: "Require Moderator, Admin, or Super Admin Role!" });
  },
  isAdmin: (req, res, next) => {
    const roles = req.roleNames || [];
    if (roles.includes("admin") || roles.includes("super_admin")) {
      return next();
    }
    return res.status(403).json({ message: "Require Admin Role!" });
  },
}));

const { default: productRoutes } = await import("../routes/products.routes.js");

const app = express();
app.use(express.json());
app.use("/api/products", productRoutes);

describe("Products routes authz", () => {
  beforeEach(() => {
    createProduct.mockClear();
    getProducts.mockClear();
    getProductById.mockClear();
    updateProductById.mockClear();
    deleteProductById.mockClear();
    searchProduct.mockClear();
  });

  test("should reject anonymous product list request", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(403);
    expect(getProducts).not.toHaveBeenCalled();
  });

  test("should allow authenticated product list request", async () => {
    const res = await request(app)
      .get("/api/products")
      .set("x-access-token", "user-token");
    expect(res.status).toBe(200);
    expect(getProducts).toHaveBeenCalledTimes(1);
  });

  test("should reject non-manager product creation", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("x-access-token", "user-token")
      .send({ name: "Notebook" });
    expect(res.status).toBe(403);
    expect(createProduct).not.toHaveBeenCalled();
  });

  test("should allow moderator product creation", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("x-access-token", "moderator-token")
      .send({ name: "Notebook" });
    expect(res.status).toBe(201);
    expect(createProduct).toHaveBeenCalledTimes(1);
  });

  test("should allow admin product update", async () => {
    const res = await request(app)
      .put("/api/products/507f1f77bcf86cd799439011")
      .set("x-access-token", "admin-token")
      .send({ price: 9.99 });
    expect(res.status).toBe(200);
    expect(updateProductById).toHaveBeenCalledTimes(1);
  });

  test("should reject moderator product deletion because it remains admin-only", async () => {
    const res = await request(app)
      .delete("/api/products/507f1f77bcf86cd799439011")
      .set("x-access-token", "moderator-token");
    expect(res.status).toBe(403);
    expect(deleteProductById).not.toHaveBeenCalled();
  });

  test("should allow admin product deletion", async () => {
    const res = await request(app)
      .delete("/api/products/507f1f77bcf86cd799439011")
      .set("x-access-token", "admin-token");
    expect(res.status).toBe(200);
    expect(deleteProductById).toHaveBeenCalledTimes(1);
  });
});
