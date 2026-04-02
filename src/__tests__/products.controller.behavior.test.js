import { jest } from "@jest/globals";

const productSaveMock = jest.fn();
const productFindMock = jest.fn();
const productFindByIdMock = jest.fn();
const productFindByIdAndUpdateMock = jest.fn();
const productFindByIdAndDeleteMock = jest.fn();

class ProductQueryMock {
  constructor(rows) {
    this.rows = rows;
  }

  limit(value) {
    this.limitValue = value;
    return Promise.resolve(this.rows);
  }
}

class ProductMock {
  constructor(payload) {
    Object.assign(this, payload);
    this._id = payload._id || "507f1f77bcf86cd799439077";
    this.createdAt = payload.createdAt || "2026-04-03T00:00:00.000Z";
    this.updatedAt = payload.updatedAt || "2026-04-03T00:00:00.000Z";
    this.toObject = () => ({
      _id: this._id,
      name: this.name,
      category: this.category,
      price: this.price,
      imgURL: this.imgURL,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });
    this.save = jest.fn(() => productSaveMock(this));
  }

  static find(...args) {
    return productFindMock(...args);
  }

  static findById(...args) {
    return productFindByIdMock(...args);
  }

  static findByIdAndUpdate(...args) {
    return productFindByIdAndUpdateMock(...args);
  }

  static findByIdAndDelete(...args) {
    return productFindByIdAndDeleteMock(...args);
  }
}

jest.unstable_mockModule("../models/Product.js", () => ({
  default: ProductMock,
}));

const {
  createProduct,
  getProductById,
  searchProduct,
  updateProductById,
} = await import("../controllers/products.controller.js");

const createRes = () => {
  const res = {};
  res.locals = { requestId: "req-products-test-1" };
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn((body) => {
    if (body?.meta) {
      body.meta.requestId = res.locals.requestId;
    } else if (body?.success === false) {
      body.requestId = res.locals.requestId;
    }
    return res;
  });
  return res;
};

describe("products controller behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    productSaveMock.mockImplementation(async (product) => product);
  });

  test("createProduct rejects invalid payload before persistence", async () => {
    const req = {
      body: {
        name: "",
        price: -5,
      },
    };
    const res = createRes();

    await createProduct(req, res);

    expect(productSaveMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: "Validation failed.",
      code: "VALIDATION_ERROR",
      requestId: "req-products-test-1",
      errors: expect.arrayContaining([
        expect.objectContaining({ field: "name" }),
        expect.objectContaining({ field: "price" }),
      ]),
    }));
  });

  test("getProductById returns canonical 404 when product is missing", async () => {
    const req = {
      params: { productId: "507f1f77bcf86cd799439099" },
    };
    const res = createRes();

    productFindByIdMock.mockResolvedValue(null);

    await getProductById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Product not found",
      code: "PRODUCT_NOT_FOUND",
      requestId: "req-products-test-1",
    });
  });

  test("updateProductById returns 200 with canonical mutation envelope", async () => {
    const req = {
      userId: "moderator-1",
      params: { productId: "507f1f77bcf86cd799439088" },
      body: { price: 42 },
    };
    const res = createRes();

    productFindByIdAndUpdateMock.mockResolvedValue({
      _id: "507f1f77bcf86cd799439088",
      name: "Payroll Handbook",
      category: "Books",
      price: 42,
      imgURL: "",
      createdAt: "2026-04-03T00:00:00.000Z",
      updatedAt: "2026-04-03T00:05:00.000Z",
    });

    await updateProductById(req, res);

    expect(productFindByIdAndUpdateMock).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439088",
      { price: 42 },
      expect.objectContaining({
        new: true,
        runValidators: true,
        context: "query",
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        _id: "507f1f77bcf86cd799439088",
        price: 42,
      }),
      meta: expect.objectContaining({
        dataset: "productMutation",
        action: "UPDATE",
        actorId: "moderator-1",
        requestId: "req-products-test-1",
        filters: { productId: "507f1f77bcf86cd799439088" },
      }),
    });
  });

  test("searchProduct uses regex lookup and returns canonical search envelope", async () => {
    const req = {
      userId: "user-1",
      params: { productName: "memo" },
    };
    const res = createRes();

    productFindMock.mockReturnValue(new ProductQueryMock([
      {
        _id: "507f1f77bcf86cd799439066",
        name: "CEO Memo Binder",
        category: "Stationery",
        price: 15,
        imgURL: "",
        createdAt: "2026-04-03T00:00:00.000Z",
        updatedAt: "2026-04-03T00:00:00.000Z",
      },
    ]));

    await searchProduct(req, res);

    expect(productFindMock).toHaveBeenCalledWith({
      name: expect.any(RegExp),
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        expect.objectContaining({
          name: "CEO Memo Binder",
        }),
      ],
      meta: expect.objectContaining({
        dataset: "productSearch",
        actorId: "user-1",
        total: 1,
        requestId: "req-products-test-1",
        filters: { productName: "memo" },
      }),
    });
  });
});
