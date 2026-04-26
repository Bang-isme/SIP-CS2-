import { Op } from "sequelize";
import Counter from "../models/Counter.js";
import IntegrationEvent from "../models/IntegrationEvent.js";
import IntegrationEventAudit from "../models/IntegrationEventAudit.js";

const EVENT_COUNTER_KEY = "integration-event-id";
const AUDIT_COUNTER_KEY = "integration-audit-id";

const normalizeDoc = (doc) => {
  if (!doc) return null;
  if (typeof doc.toObject === "function") {
    return doc.toObject();
  }
  return doc;
};

const buildSort = (order = []) => {
  if (!Array.isArray(order) || order.length === 0) {
    return undefined;
  }

  const sort = {};
  order.forEach((entry) => {
    if (!Array.isArray(entry) || entry.length < 2) return;
    const [field, direction] = entry;
    sort[field] = String(direction || "ASC").toUpperCase() === "DESC" ? -1 : 1;
  });
  return sort;
};

const buildSelect = (attributes = []) => {
  if (!Array.isArray(attributes) || attributes.length === 0) {
    return undefined;
  }
  const fields = attributes.filter((entry) => typeof entry === "string");
  return fields.length > 0 ? fields.join(" ") : undefined;
};

const mapCondition = (value) => {
  if (
    value === null
    || value === undefined
    || value instanceof Date
    || Array.isArray(value)
    || typeof value !== "object"
  ) {
    return value;
  }

  const result = {};
  let usedOperator = false;

  Reflect.ownKeys(value).forEach((key) => {
    const operatorValue = value[key];
    if (key === Op.in) {
      result.$in = operatorValue;
      usedOperator = true;
      return;
    }
    if (key === Op.lte) {
      result.$lte = operatorValue;
      usedOperator = true;
      return;
    }
    if (key === Op.gte) {
      result.$gte = operatorValue;
      usedOperator = true;
      return;
    }
    if (typeof key === "string") {
      result[key] = operatorValue;
    }
  });

  return usedOperator ? result : value;
};

const mapWhere = (where = {}) => {
  const query = {};

  Reflect.ownKeys(where || {}).forEach((key) => {
    const value = where[key];
    if (key === Op.or) {
      query.$or = Array.isArray(value) ? value.map((entry) => mapWhere(entry)) : [];
      return;
    }

    if (typeof key === "string") {
      query[key] = mapCondition(value);
    }
  });

  return query;
};

const getNextSequenceValue = async (key) => {
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  ).lean();

  return counter.seq;
};

const buildListQuery = (Model, {
  where = {},
  order = [],
  limit,
  offset,
  attributes,
} = {}) => {
  let query = Model.find(mapWhere(where));
  const sort = buildSort(order);
  const select = buildSelect(attributes);

  if (sort) {
    query = query.sort(sort);
  }
  if (Number.isFinite(offset) && offset > 0) {
    query = query.skip(offset);
  }
  if (Number.isFinite(limit) && limit > 0) {
    query = query.limit(limit);
  }
  if (select) {
    query = query.select(select);
  }

  return query.lean();
};

const createStore = (Model, counterKey) => ({
  async create(record) {
    const id = record.id ?? await getNextSequenceValue(counterKey);
    const created = await Model.create({ ...record, id });
    return normalizeDoc(created);
  },

  async bulkCreate(records = []) {
    if (!Array.isArray(records) || records.length === 0) {
      return [];
    }

    const docs = [];
    for (const record of records) {
      const id = record.id ?? await getNextSequenceValue(counterKey);
      docs.push({ ...record, id });
    }

    const created = await Model.insertMany(docs, { ordered: true });
    return created.map((doc) => normalizeDoc(doc));
  },

  async count({ where = {} } = {}) {
    return Model.countDocuments(mapWhere(where));
  },

  async findAll(options = {}) {
    return buildListQuery(Model, options).exec();
  },

  async findOne(options = {}) {
    const rows = await buildListQuery(Model, { ...options, limit: 1 }).exec();
    return rows[0] || null;
  },

  async findByPk(id) {
    return Model.findOne({ id }).lean().exec();
  },

  async update(patch, { where = {} } = {}) {
    const result = await Model.updateMany(mapWhere(where), { $set: patch });
    const count = result.matchedCount ?? result.modifiedCount ?? 0;
    return [count];
  },
});

export const IntegrationEventStore = createStore(IntegrationEvent, EVENT_COUNTER_KEY);
export const IntegrationEventAuditStore = createStore(IntegrationEventAudit, AUDIT_COUNTER_KEY);

export const groupIntegrationEventCountsByStatus = async () => {
  const rows = await IntegrationEvent.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  return rows.map((row) => ({
    status: row._id,
    count: row.count,
  }));
};

export default {
  IntegrationEventStore,
  IntegrationEventAuditStore,
  groupIntegrationEventCountsByStatus,
};
