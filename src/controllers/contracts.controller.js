import createOpenApiContract from "../contracts/openapi.contract.js";

export const getOpenApiContract = (_req, res) => {
  return res.json(createOpenApiContract());
};

const buildSwaggerUiHtml = ({
  assetsBasePath,
  openApiPath,
}) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SIP_CS Backend Contract Docs</title>
    <link rel="stylesheet" href="${assetsBasePath}/swagger-ui.css" />
    <link rel="icon" type="image/png" href="${assetsBasePath}/favicon-32x32.png" sizes="32x32" />
    <link rel="icon" type="image/png" href="${assetsBasePath}/favicon-16x16.png" sizes="16x16" />
  </head>
  <body>
    <div id="swagger-ui" data-openapi-url="${openApiPath}"></div>
    <script src="${assetsBasePath}/swagger-ui-bundle.js" crossorigin></script>
    <script src="${assetsBasePath}/swagger-ui-standalone-preset.js" crossorigin></script>
    <script src="./swagger-initializer.js" crossorigin></script>
  </body>
</html>`;

export const getOpenApiDocsPage = (req, res) => {
  const docsBasePath = `${req.baseUrl}/docs`;
  const assetsBasePath = `${docsBasePath}/assets`;
  const openApiPath = `${req.baseUrl}/openapi.json`;

  return res
    .set("Content-Type", "text/html; charset=utf-8")
    .send(buildSwaggerUiHtml({ assetsBasePath, openApiPath }));
};

export const getOpenApiDocsInitializer = (req, res) => {
  const openApiPath = `${req.baseUrl}/openapi.json`;

  return res
    .type("application/javascript")
    .send(`window.onload = function () {
  var container = document.getElementById("swagger-ui");
  var specUrl = (container && container.dataset && container.dataset.openapiUrl) || "${openApiPath}";
  window.ui = SwaggerUIBundle({
    url: specUrl,
    dom_id: "#swagger-ui",
    deepLinking: true,
    displayRequestDuration: true,
    docExpansion: "list",
    persistAuthorization: true,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset,
    ],
    layout: "StandaloneLayout",
  });
};`);
};

export default {
  getOpenApiContract,
  getOpenApiDocsInitializer,
  getOpenApiDocsPage,
};
