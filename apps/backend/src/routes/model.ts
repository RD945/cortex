import { getCurrentModelConfig, getModels, setActiveModel } from "@cortex/ai";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { createChildLogger } from "../lib/logger.js";
import { getCurrentModelRouteDescription } from "../schemas/model-routes.js";
import type { RouteVariables } from "../types/route-variables.js";

const logger = createChildLogger("model");

export const modelRoutes = new Hono<{ Variables: RouteVariables }>();

// GET /api/model/ - Get current active model configuration
modelRoutes.get(
  "/",
  describeRoute(getCurrentModelRouteDescription),
  async (c) => {
    const requestId = c.get("requestId");
    logger.info({ requestId }, "Current model config request received");

    try {
      const modelConfig = getCurrentModelConfig("backend");

      if (!modelConfig) {
        logger.warn(
          { requestId },
          "Failed to retrieve current model configuration",
        );
        return c.json(
          {
            error: "Configuration error",
            message: "Unable to retrieve current model configuration",
          },
          500,
        );
      }

      logger.info(
        {
          requestId,
          provider: modelConfig.provider,
          providerModel: modelConfig.providerModel,
        },
        "Returning current model configuration",
      );

      return c.json(modelConfig);
    } catch (error) {
      logger.error(
        {
          requestId,
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        },
        "Error retrieving current model configuration",
      );

      return c.json(
        {
          error: "Internal server error",
          message: "An error occurred while retrieving the model configuration",
        },
        500,
      );
    }
  },
);

// GET /api/model/list - Get all available models
modelRoutes.get("/list", async (c) => {
  const requestId = c.get("requestId");
  logger.info({ requestId }, "List models request received");

  try {
    const allModels = getModels();
    const currentModel = getCurrentModelConfig("backend");

    // Transform to a more frontend-friendly format
    const models = allModels.map(({ id, model }) => ({
      id,
      name: model.name,
      provider: model.provider,
      providerModel: model.providerModel,
      capabilities: model.capabilities,
      pricing: model.pricing,
      isActive: currentModel?.id === id,
    }));

    // Group by provider
    const grouped = models.reduce(
      (acc, model) => {
        const provider = model.provider;
        if (!acc[provider]) {
          acc[provider] = [];
        }
        acc[provider].push(model);
        return acc;
      },
      {} as Record<string, typeof models>,
    );

    logger.info(
      { requestId, modelCount: models.length },
      "Returning model list",
    );

    return c.json({
      models,
      grouped,
      current: currentModel?.id,
    });
  } catch (error) {
    logger.error(
      {
        requestId,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      "Error listing models",
    );

    return c.json(
      {
        error: "Internal server error",
        message: "An error occurred while listing models",
      },
      500,
    );
  }
});

// POST /api/model/select - Set active model
modelRoutes.post("/select", async (c) => {
  const requestId = c.get("requestId");

  try {
    const body = await c.req.json();
    const { modelId, context = "backend" } = body;

    if (!modelId) {
      return c.json({ error: "modelId is required" }, 400);
    }

    logger.info({ requestId, modelId, context }, "Setting active model");

    setActiveModel(context, modelId);

    const newConfig = getCurrentModelConfig(context);

    logger.info(
      { requestId, modelId, context },
      "Active model changed successfully",
    );

    return c.json({
      success: true,
      modelId,
      context,
      model: newConfig,
    });
  } catch (error) {
    logger.error(
      {
        requestId,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      "Error setting active model",
    );

    return c.json(
      {
        error: "Failed to set model",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});
