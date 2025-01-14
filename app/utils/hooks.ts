import { useMemo, useState, useEffect } from "react";
import { useAccessStore, useAppConfig } from "../store";
import { collectModelsWithDefaultModel } from "./model";

interface ModelData {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  active: boolean;
  context_window: number;
  public_apps: null;
}

interface ModelsResponse {
  object: string;
  data: ModelData[];
}

export function useAllModels() {
  const [apiModels, setApiModels] = useState<ModelData[]>([]);
  const accessStore = useAccessStore();
  const configStore = useAppConfig();

  useEffect(() => {
    // 方案1：使用 AbortController 来处理重复请求
    const controller = new AbortController();
    const fetchModels = async () => {
      try {
        const response = await fetch(
          window.location.hostname === "localhost"
            ? "https://chat.songm.top/api/openai/v1/models"
            : "/api/openai/v1/models",
          {
            signal: controller.signal,
          },
        );
        const data: ModelsResponse = await response.json();
        setApiModels(data.data);
      } catch (error: any) {
        if (error.name !== "AbortError") {
          console.error("获取模型列表失败:", error);
        }
      }
    };

    fetchModels();
    return () => controller.abort();
  }, []);

  const models = useMemo(() => {
    let seq = 1;
    let seq2 = 1000;
    // apiModels排除含whisper的模型
    const apiModelIds = apiModels
      .filter((model) => !model.id.includes("whisper"))
      .map((model) => ({
        name: model.id,
        available: model.active,
        provider: {
          id: model.owned_by,
          providerName: model.owned_by,
          providerType: model.owned_by,
          sorted: seq++,
        },
        sorted: seq2++,
      }));
    apiModelIds.push(
      {
        name: "llama-3.3-70b-versatile",
        available: true,
        sorted: seq2++,
        provider: {
          id: "llama-3.3-70b-versatile",
          providerName: "默认",
          providerType: "meta",
          sorted: seq++,
        },
      },
      {
        name: "deepseek-chat",
        available: true,
        sorted: seq2++,
        provider: {
          id: "deepseek",
          providerName: "DeepSeek",
          providerType: "deepseek",
          sorted: seq++,
        },
      },
      {
        name: "claude-3.5-sonnet",
        available: true,
        sorted: seq2++,
        provider: {
          id: "anthropic",
          providerName: "Anthropic",
          providerType: "anthropic",
          sorted: seq++,
        },
      },
      {
        name: "gpt-4o",
        available: true,
        sorted: seq2++,
        provider: {
          id: "openai",
          providerName: "OpenAI",
          providerType: "openai",
          sorted: seq++,
        },
      },
      {
        name: "GLM-4",
        available: true,
        sorted: seq2++,
        provider: {
          id: "chatglm",
          providerName: "智谱清言",
          providerType: "chatglm",
          sorted: seq++,
        },
      },
      {
        name: "qwen2.5-72b-instruct",
        available: true,
        sorted: seq2++,
        provider: {
          id: "qwen",
          providerName: "通义千问",
          providerType: "qwen",
          sorted: seq++,
        },
      },
    );

    // 合并API模型与现有配置
    return collectModelsWithDefaultModel(
      [...apiModelIds],
      [configStore.customModels, accessStore.customModels].join(","),
      accessStore.defaultModel,
    );
  }, [
    apiModels,
    accessStore.customModels,
    accessStore.defaultModel,
    configStore.customModels,
    configStore.models,
  ]);

  return models;
}
