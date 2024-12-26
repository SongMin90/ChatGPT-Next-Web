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
    // 将API模型转换为应用所需的格式
    let seq = 1000;
    const apiModelIds = apiModels.map((model) => ({
      name: model.id,
      available: model.active,
      provider: {
        id: model.owned_by,
        providerName: model.owned_by,
        providerType: model.owned_by,
        sorted: 1,
      },
      sorted: seq++,
    }));

    // 确定默认模型
    let defaultModel = accessStore.defaultModel;
    if (!defaultModel) {
      const preferredModel = apiModelIds.find(
        (model) => model.name === "llama-3.3-70b-versatile",
      );
      if (preferredModel) {
        defaultModel = preferredModel.name;
      }
    }

    // 合并API模型与现有配置
    return collectModelsWithDefaultModel(
      [...apiModelIds],
      [configStore.customModels, accessStore.customModels].join(","),
      defaultModel,
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
