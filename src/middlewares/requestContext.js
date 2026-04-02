import {
  createRequestId,
  getRequestId,
  injectRequestIdIntoBody,
  REQUEST_ID_HEADER,
} from "../utils/requestTracking.js";

export const attachRequestContext = (req, res, next) => {
  const requestId = getRequestId({ req }) || createRequestId();

  req.requestId = requestId;
  res.locals.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);

  const originalSend = res.send.bind(res);
  res.send = (body) => originalSend(injectRequestIdIntoBody(body, requestId));

  const originalJson = res.json.bind(res);
  res.json = (body) => originalJson(injectRequestIdIntoBody(body, requestId));

  next();
};

export {
  REQUEST_ID_HEADER,
};
