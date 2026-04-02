import Product from "../models/Product.js";
import {
  createBadRequestError,
  createNotFoundError,
  respondWithApiError,
  sendApiError,
} from "../utils/apiErrors.js";
import {
  buildProductMeta,
  normalizeProductIdParam,
  normalizeProductPayload,
  normalizeProductSearchParam,
  ProductContractError,
  sendProductContractError,
} from "../utils/productContracts.js";

const escapeRegexLiteral = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const sanitizeProduct = (productDoc) => {
  const source = productDoc && typeof productDoc.toObject === "function"
    ? productDoc.toObject()
    : productDoc || {};

  return {
    _id: source._id?.toString?.() || source._id,
    name: source.name || "",
    category: source.category || "",
    price: Number.isFinite(source.price) ? source.price : Number(source.price) || 0,
    imgURL: source.imgURL || "",
    createdAt: source.createdAt || null,
    updatedAt: source.updatedAt || null,
  };
};

export const createProduct = async (req, res) => {
  try {
    const productPayload = normalizeProductPayload(req.body, { partial: false });
    const newProduct = new Product(productPayload);
    const productSaved = await newProduct.save();

    return res.status(201).json({
      success: true,
      data: sanitizeProduct(productSaved),
      meta: buildProductMeta({
        req,
        res,
        dataset: "products",
        actorId: req.userId || null,
      }),
    });
  } catch (error) {
    if (error instanceof ProductContractError) {
      return sendProductContractError(res, error);
    }
    return respondWithApiError({
      req,
      res,
      error,
      context: "ProductsController",
      defaultCode: "PRODUCT_CREATE_FAILED",
    });
  }
};

export const getProductById = async (req, res) => {
  try {
    const productId = normalizeProductIdParam(req.params.productId);
    const product = await Product.findById(productId);

    if (!product) {
      return sendApiError(res, createNotFoundError("Product not found", "PRODUCT_NOT_FOUND"));
    }

    return res.status(200).json({
      success: true,
      data: sanitizeProduct(product),
      meta: buildProductMeta({
        req,
        res,
        dataset: "productDetail",
        actorId: req.userId || null,
        filters: { productId },
      }),
    });
  } catch (error) {
    if (error instanceof ProductContractError) {
      return sendProductContractError(res, error);
    }
    return respondWithApiError({
      req,
      res,
      error,
      context: "ProductsController",
      defaultCode: "PRODUCT_DETAIL_LOOKUP_FAILED",
    });
  }
};

export const getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    const data = products.map((product) => sanitizeProduct(product));

    return res.json({
      success: true,
      data,
      meta: buildProductMeta({
        req,
        res,
        dataset: "products",
        actorId: req.userId || null,
        total: data.length,
      }),
    });
  } catch (error) {
    return respondWithApiError({
      req,
      res,
      error,
      context: "ProductsController",
      defaultCode: "PRODUCT_LIST_FAILED",
    });
  }
};

export const updateProductById = async (req, res) => {
  try {
    const productId = normalizeProductIdParam(req.params.productId);
    const updatePayload = normalizeProductPayload(req.body, { partial: true });

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updatePayload,
      {
        new: true,
        runValidators: true,
        context: "query",
      },
    );

    if (!updatedProduct) {
      return sendApiError(res, createNotFoundError("Product not found", "PRODUCT_NOT_FOUND"));
    }

    return res.status(200).json({
      success: true,
      data: sanitizeProduct(updatedProduct),
      meta: buildProductMeta({
        req,
        res,
        dataset: "productMutation",
        actorId: req.userId || null,
        filters: { productId },
        action: "UPDATE",
      }),
    });
  } catch (error) {
    if (error instanceof ProductContractError) {
      return sendProductContractError(res, error);
    }
    return respondWithApiError({
      req,
      res,
      error,
      context: "ProductsController",
      defaultCode: "PRODUCT_UPDATE_FAILED",
    });
  }
};

export const deleteProductById = async (req, res) => {
  try {
    const productId = normalizeProductIdParam(req.params.productId);
    const deletedProduct = await Product.findByIdAndDelete(productId);

    if (!deletedProduct) {
      return sendApiError(res, createNotFoundError("Product not found", "PRODUCT_NOT_FOUND"));
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted",
      meta: buildProductMeta({
        req,
        res,
        dataset: "productMutation",
        actorId: req.userId || null,
        filters: { productId },
        action: "DELETE",
      }),
    });
  } catch (error) {
    if (error instanceof ProductContractError) {
      return sendProductContractError(res, error);
    }
    return respondWithApiError({
      req,
      res,
      error,
      context: "ProductsController",
      defaultCode: "PRODUCT_DELETE_FAILED",
    });
  }
};

export const searchProduct = async (req, res) => {
  try {
    const productName = normalizeProductSearchParam(req.params.productName);
    if (productName.length < 2) {
      return sendApiError(
        res,
        createBadRequestError(
          "productName must be at least 2 characters for search.",
          "PRODUCT_SEARCH_TERM_TOO_SHORT",
        ),
      );
    }

    const nameRegex = new RegExp(escapeRegexLiteral(productName), "i");
    const results = await Product.find({ name: nameRegex }).limit(10);
    const data = results.map((product) => sanitizeProduct(product));

    return res.json({
      success: true,
      data,
      meta: buildProductMeta({
        req,
        res,
        dataset: "productSearch",
        actorId: req.userId || null,
        total: data.length,
        filters: { productName },
      }),
    });
  } catch (error) {
    if (error instanceof ProductContractError) {
      return sendProductContractError(res, error);
    }
    return respondWithApiError({
      req,
      res,
      error,
      context: "ProductsController",
      defaultCode: "PRODUCT_SEARCH_FAILED",
    });
  }
};
