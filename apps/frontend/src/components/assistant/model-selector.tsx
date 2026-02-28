// components/assistant/model-selector.tsx

import { useCallback, useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/frontend-api";
import { Brain, Eye, Sparkles, Zap } from "lucide-react";

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  providerModel: string;
  isActive: boolean;
  capabilities?: {
    modalities?: { input?: string[]; output?: string[] };
    streaming?: boolean;
    tools?: boolean;
    reasoning?: { supported?: boolean; mode?: string };
    contextWindow?: number;
  };
  pricing?: { inputPer1M?: number; outputPer1M?: number };
}

interface ModelsResponse {
  models: ModelInfo[];
  grouped: Record<string, ModelInfo[]>;
  current: string;
}

interface ModelSelectorProps {
  onModelChange?: (modelId: string) => void;
  className?: string;
}

// Provider display names - only used for grouping
const GROUP_NAMES: Record<string, string> = {
  cloud: "Cloud Models",
  local: "Local Models",
};

// Providers considered "local"
const LOCAL_PROVIDERS = ["llama-cpp", "llama-cpp-2", "ollama", "lm-studio", "mlx-lm", "mlx-vlm"];

// Allowed cloud model IDs (only show these in UI)
const ALLOWED_CLOUD_MODELS = [
  "openai:gpt-4o",
  "openai:gpt-4.1",
  "openrouter:qwen-qwen3-vl-30b-a3b-instruct",
];

// Default model
const DEFAULT_MODEL = "openai:gpt-4o";

export function ModelSelector({ onModelChange, className }: ModelSelectorProps) {
  const [models, setModels] = useState<ModelsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<string>(DEFAULT_MODEL);
  const [isChanging, setIsChanging] = useState(false);

  const fetchModels = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiFetch("/api/model/list");
      if (!response.ok) {
        throw new Error("Failed to fetch models");
      }
      const data: ModelsResponse = await response.json();
      setModels(data);
      // Only update from server if we have a valid current model
      if (data.current) {
        setCurrentModel(data.current);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const handleModelChange = async (modelId: string) => {
    if (modelId === currentModel || isChanging) return;

    // Optimistically update the UI immediately
    const previousModel = currentModel;
    setCurrentModel(modelId);
    setIsChanging(true);
    
    try {
      const response = await apiFetch("/api/model/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId, context: "backend" }),
      });

      if (!response.ok) {
        // Revert on failure
        setCurrentModel(previousModel);
        throw new Error("Failed to change model");
      }

      onModelChange?.(modelId);
    } catch (err) {
      console.error("Failed to change model:", err);
      // Revert on error
      setCurrentModel(previousModel);
    } finally {
      setIsChanging(false);
    }
  };

  const getModelIcon = (model: ModelInfo) => {
    const caps = model.capabilities;
    if (caps?.reasoning?.supported) {
      return <Brain className="h-3 w-3 text-amber-500" />;
    }
    if (caps?.modalities?.input?.includes("image")) {
      return <Eye className="h-3 w-3 text-blue-500" />;
    }
    if (caps?.tools) {
      return <Sparkles className="h-3 w-3 text-yellow-500" />;
    }
    return <Zap className="h-3 w-3 text-green-500" />;
  };

  const getModelBadge = (model: ModelInfo) => {
    const caps = model.capabilities;
    if (caps?.reasoning?.supported) {
      return (
        <Badge variant="secondary" className="ml-2 text-[10px] px-1 py-0">
          Reasoning
        </Badge>
      );
    }
    if (caps?.modalities?.input?.includes("image")) {
      return (
        <Badge variant="secondary" className="ml-2 text-[10px] px-1 py-0">
          Vision
        </Badge>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className={`h-9 w-48 animate-pulse rounded-md bg-muted ${className}`} />
    );
  }

  if (error || !models) {
    return null;
  }

  // Filter and group models - only show allowed models
  const cloudModels: ModelInfo[] = [];
  const localModels: ModelInfo[] = [];
  
  for (const model of models.models) {
    const isLocal = LOCAL_PROVIDERS.includes(model.provider);
    
    if (isLocal) {
      // Show all local models
      localModels.push(model);
    } else if (ALLOWED_CLOUD_MODELS.includes(model.id)) {
      // Only show allowed cloud models
      cloudModels.push(model);
    }
  }

  const selectedModel = models.models.find((m) => m.id === currentModel);

  return (
    <Select
      value={currentModel}
      onValueChange={handleModelChange}
      disabled={isChanging}
    >
      <SelectTrigger className={`w-52 h-9 text-sm ${className}`}>
        <SelectValue placeholder="Select model">
          {selectedModel?.name || "Select model"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {cloudModels.length > 0 && (
          <SelectGroup>
            <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
              {GROUP_NAMES.cloud}
            </SelectLabel>
            {cloudModels.map((model) => (
              <SelectItem
                key={model.id}
                value={model.id}
                className="py-2 px-2"
              >
                <div className="flex items-center gap-2">
                  {getModelIcon(model)}
                  <span className="truncate">{model.name}</span>
                  {getModelBadge(model)}
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {localModels.length > 0 && (
          <SelectGroup>
            <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
              {GROUP_NAMES.local}
            </SelectLabel>
            {localModels.map((model) => (
              <SelectItem
                key={model.id}
                value={model.id}
                className="py-2 px-2"
              >
                <div className="flex items-center gap-2">
                  {getModelIcon(model)}
                  <span className="truncate">{model.name}</span>
                  {getModelBadge(model)}
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
}

export default ModelSelector;
