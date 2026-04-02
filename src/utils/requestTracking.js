import { randomUUID } from "crypto";

export const REQUEST_ID_HEADER = "x-request-id";

const REQUEST_ID_MAX_LENGTH = 120;

const normalizeHeaderValue = (value) => {
  if (Array.isArray(value)) {
    return normalizeHeaderValue(value[0]);
  }

  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
};

export const normalizeRequestId = (value) => {
  const normalized = normalizeHeaderValue(value);

  if (!normalized || normalized.length > REQUEST_ID_MAX_LENGTH) {
    return null;
  }

  return normalized;
};

export const createRequestId = () => randomUUID();

export const getRequestId = ({
  requestId = null,
  req = null,
  res = null,
} = {}) => {
  const directRequestId = normalizeRequestId(requestId);
  if (directRequestId) {
    return directRequestId;
  }

  const requestScopedId = normalizeRequestId(
    req?.requestId
      ?? req?.get?.(REQUEST_ID_HEADER)
      ?? req?.headers?.[REQUEST_ID_HEADER],
  );
  if (requestScopedId) {
    return requestScopedId;
  }

  return normalizeRequestId(
    res?.locals?.requestId
      ?? res?.req?.requestId
      ?? res?.getHeader?.(REQUEST_ID_HEADER),
  );
};

export const injectRequestIdIntoBody = (body, requestId) => {
  const resolvedRequestId = normalizeRequestId(requestId);
  if (!resolvedRequestId || !body || typeof body !== "object" || Array.isArray(body)) {
    return body;
  }

  let nextBody = body;

  if (body.meta && typeof body.meta === "object" && !Array.isArray(body.meta)) {
    nextBody = {
      ...nextBody,
      meta: {
        ...body.meta,
        requestId: resolvedRequestId,
      },
    };
  }

  const hasMessage = typeof body.message === "string" && body.message.trim().length > 0;
  const shouldAttachTopLevelRequestId = body.success === false
    || (hasMessage && body.success !== true);

  if (shouldAttachTopLevelRequestId) {
    nextBody = {
      ...nextBody,
      requestId: resolvedRequestId,
    };
  }

  return nextBody;
};

export const buildRequestLogData = ({
  req = null,
  res = null,
  actorId = undefined,
  ...rest
} = {}) => ({
  requestId: getRequestId({ req, res }),
  method: req?.method,
  path: req?.originalUrl || req?.url,
  actorId: actorId ?? req?.userId ?? null,
  ...rest,
});
