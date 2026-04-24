"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ChangeEvent,
} from "react";
import { useFlashcardStore } from "@/lib/store";
import * as catalog from "@/lib/ai/catalog";
import { getProvider } from "@/lib/ai/providers";
import { listCompatibleModels } from "@/lib/ai/router";
import {
  FEATURE_IDS,
  PROVIDER_IDS,
  type FeatureId,
  type ProviderId,
} from "@/lib/ai/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ExternalLink,
  Upload,
  Download,
  CheckCircle2,
  XCircle,
  CircleDashed,
  Loader2,
  Plus,
  Trash2,
  Key,
} from "lucide-react";
import { toast } from "sonner";

const PROVIDER_CONSOLE_URLS: Record<ProviderId, string> = {
  gemini: "https://ai.google.dev/",
  openai: "https://platform.openai.com/api-keys",
  anthropic: "https://console.anthropic.com/settings/keys",
  openrouter: "https://openrouter.ai/keys",
};

const FEATURE_LABELS: Record<FeatureId, string> = {
  "study-guide": "Roadmap",
  flashcards: "Flashcards",
  notes: "Notes",
  transcript: "Transcript",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
      {children}
    </p>
  );
}

function OpenRouterModelInput() {
  const customModels = useFlashcardStore((s) => s.openRouterCustomModels);
  const addModel = useFlashcardStore((s) => s.addOpenRouterCustomModel);
  const removeModel = useFlashcardStore((s) => s.removeOpenRouterCustomModel);
  const [input, setInput] = useState("");
  const [checkState, setCheckState] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkModel = useCallback(async (modelId: string) => {
    if (!modelId.trim()) { setCheckState("idle"); return; }
    setCheckState("checking");
    try {
      const res = await fetch("https://openrouter.ai/api/v1/models");
      if (!res.ok) { setCheckState("idle"); return; }
      const json = await res.json() as { data: { id: string }[] };
      setCheckState(json.data.some((m) => m.id === modelId.trim()) ? "valid" : "invalid");
    } catch {
      setCheckState("idle");
    }
  }, []);

  const handleChange = (val: string) => {
    setInput(val);
    setCheckState("idle");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => checkModel(val), 600);
  };

  const handleAdd = () => {
    const id = input.trim();
    if (!id || checkState !== "valid") return;
    addModel(id);
    setInput("");
    setCheckState("idle");
    toast.success(`Model added: ${id}`);
  };

  return (
    <div className="mt-4 pt-4 border-t space-y-3">
      <p className="text-sm font-medium">Custom models</p>
      <p className="text-xs text-muted-foreground">
        Any model ID from{" "}
        <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">
          openrouter.ai/models
        </a>{" "}
        — e.g. <code className="bg-muted px-1 rounded text-[11px]">anthropic/claude-3-5-sonnet</code>
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={input}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="provider/model-name"
            className="pr-8 h-9 text-sm"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            {checkState === "checking" && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            {checkState === "valid" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
            {checkState === "invalid" && <XCircle className="h-3.5 w-3.5 text-destructive" />}
          </div>
        </div>
        <Button size="sm" onClick={handleAdd} disabled={checkState !== "valid"} className="h-9 w-9 p-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {checkState === "invalid" && <p className="text-xs text-destructive">Model not found on OpenRouter</p>}
      {customModels.length > 0 && (
        <div className="space-y-1.5">
          {customModels.map((m) => (
            <div key={m} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs">
              <code className="font-mono text-foreground">{m}</code>
              <button onClick={() => removeModel(m)} className="text-muted-foreground hover:text-destructive transition-colors ml-2 shrink-0">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, hasKey }: { status: "ok" | "invalid" | "unknown"; hasKey: boolean }) {
  if (status === "ok") return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
      <CheckCircle2 className="h-3.5 w-3.5" /> Connected
    </span>
  );
  if (status === "invalid") return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive">
      <XCircle className="h-3.5 w-3.5" /> Invalid key
    </span>
  );
  if (hasKey) return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
      <CircleDashed className="h-3.5 w-3.5" /> Untested
    </span>
  );
  return <span className="text-[11px] text-muted-foreground">No key</span>;
}

function ProviderCard({ providerId }: { providerId: ProviderId }) {
  const provider = getProvider(providerId);
  const stored = useFlashcardStore((s) => s.providers[providerId]);
  const setProviderKey = useFlashcardStore((s) => s.setProviderKey);
  const setProviderValidated = useFlashcardStore((s) => s.setProviderValidated);

  const [localKey, setLocalKey] = useState(stored.apiKey ?? "");
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<"ok" | "invalid" | "unknown">(
    stored.lastValidatedAt ? "ok" : "unknown"
  );

  useEffect(() => {
    setLocalKey(stored.apiKey ?? "");
  }, [stored.apiKey]);

  const saveKey = () => {
    setProviderKey(providerId, localKey.trim() || null);
    setStatus("unknown");
    toast.success(`${provider.displayName} key saved`);
  };

  const testKey = async () => {
    if (!localKey.trim()) return;
    setTesting(true);
    const result = await provider.testConnection(localKey.trim());
    setTesting(false);
    if (result.ok) {
      setStatus("ok");
      setProviderKey(providerId, localKey.trim());
      setProviderValidated(providerId, Date.now());
      toast.success(`${provider.displayName} connected`);
    } else {
      setStatus("invalid");
      toast.error(`${provider.displayName}: ${result.error}`);
    }
  };

  const clearKey = () => {
    setProviderKey(providerId, null);
    setLocalKey("");
    setStatus("unknown");
    toast.info(`${provider.displayName} key cleared`);
  };

  return (
    <div className="py-5 first:pt-0 border-b last:border-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Key className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{provider.displayName}</span>
        </div>
        <StatusBadge status={status} hasKey={!!stored.apiKey} />
      </div>

      <div className="flex gap-2">
        <Input
          type="password"
          value={localKey}
          onChange={(e) => setLocalKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && saveKey()}
          placeholder={`${provider.displayName} API key`}
          className="h-9 text-sm flex-1"
        />
        <Button onClick={saveKey} size="sm" className="h-9 shrink-0">Save</Button>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <Button
          onClick={testKey}
          size="sm"
          variant="ghost"
          disabled={!localKey.trim() || testing}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          {testing ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Testing…</> : "Test connection"}
        </Button>
        {stored.apiKey && (
          <Button onClick={clearKey} size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive">
            Clear
          </Button>
        )}
        <a
          href={PROVIDER_CONSOLE_URLS[providerId]}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
        >
          Get a key <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {providerId === "openrouter" && <OpenRouterModelInput />}
    </div>
  );
}

function StyledSelect({ value, onChange, children }: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
    >
      {children}
    </select>
  );
}

function DefaultModelPicker() {
  const selection = useFlashcardStore((s) => s.modelRouting.default);
  const setDefaultModel = useFlashcardStore((s) => s.setDefaultModel);
  const providers = useFlashcardStore((s) => s.providers);
  useFlashcardStore((s) => s.openRouterCatalog);
  useFlashcardStore((s) => s.openRouterCustomModels);

  const availableProviders = PROVIDER_IDS.filter((id) => providers[id].apiKey);
  const modelsForProvider = catalog.listForProvider(selection.providerId);

  useEffect(() => {
    if (modelsForProvider.length > 0 && !modelsForProvider.find((m) => m.modelId === selection.modelId)) {
      setDefaultModel({ providerId: selection.providerId, modelId: modelsForProvider[0].modelId });
    }
  }, [selection.providerId, selection.modelId, modelsForProvider, setDefaultModel]);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Default model</p>
      <p className="text-xs text-muted-foreground">Used for all features unless overridden below.</p>
      <div className="grid grid-cols-2 gap-2">
        <StyledSelect
          value={selection.providerId}
          onChange={(v) => {
            const providerId = v as ProviderId;
            const first = catalog.listForProvider(providerId)[0];
            if (first) setDefaultModel({ providerId, modelId: first.modelId });
          }}
        >
          {PROVIDER_IDS.map((id) => (
            <option key={id} value={id} disabled={!availableProviders.includes(id)}>
              {getProvider(id).displayName}{!availableProviders.includes(id) ? " (no key)" : ""}
            </option>
          ))}
        </StyledSelect>
        <StyledSelect
          value={modelsForProvider.find((m) => m.modelId === selection.modelId) ? selection.modelId : (modelsForProvider[0]?.modelId ?? "")}
          onChange={(v) => setDefaultModel({ providerId: selection.providerId, modelId: v })}
        >
          {modelsForProvider.map((m) => (
            <option key={m.modelId} value={m.modelId}>
              {m.displayName}{m.supportsVision ? " · Vision" : ""}
            </option>
          ))}
        </StyledSelect>
      </div>
    </div>
  );
}

function FeatureOverridesSection() {
  const overrides = useFlashcardStore((s) => s.modelRouting.overrides);
  const setFeatureOverride = useFlashcardStore((s) => s.setFeatureOverride);
  const providers = useFlashcardStore((s) => s.providers);
  const availableProviders = PROVIDER_IDS.filter((id) => providers[id].apiKey);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">Per-feature overrides</p>
        <p className="text-xs text-muted-foreground mt-0.5">Route specific features to a different model than the default.</p>
      </div>
      <div className="space-y-2">
        {FEATURE_IDS.map((feature) => {
          const sel = overrides[feature];
          const compatible = listCompatibleModels(feature);
          const compatibleForSelected = sel ? compatible.filter((m) => m.providerId === sel.providerId) : [];

          return (
            <div key={feature} className="rounded-lg border bg-muted/20 p-3 space-y-2">
              <label className="flex items-center justify-between cursor-pointer select-none">
                <span className="text-sm font-medium">{FEATURE_LABELS[feature]}</span>
                <div className="flex items-center gap-2">
                  {sel && <span className="text-xs text-muted-foreground">Override</span>}
                  <input
                    type="checkbox"
                    checked={!!sel}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const first = compatible.find((m) => availableProviders.includes(m.providerId));
                        if (first) {
                          setFeatureOverride(feature, { providerId: first.providerId, modelId: first.modelId });
                        } else {
                          toast.error("No compatible model available for this feature.");
                        }
                      } else {
                        setFeatureOverride(feature, null);
                      }
                    }}
                    className="h-4 w-4 accent-foreground"
                  />
                </div>
              </label>
              {sel && (
                <div className="grid grid-cols-2 gap-2">
                  <StyledSelect
                    value={sel.providerId}
                    onChange={(v) => {
                      const providerId = v as ProviderId;
                      const first = compatible.find((m) => m.providerId === providerId);
                      if (first) setFeatureOverride(feature, { providerId, modelId: first.modelId });
                    }}
                  >
                    {PROVIDER_IDS.map((id) => {
                      const hasCompat = compatible.some((m) => m.providerId === id);
                      return (
                        <option key={id} value={id} disabled={!availableProviders.includes(id) || !hasCompat}>
                          {getProvider(id).displayName}
                          {!availableProviders.includes(id) ? " (no key)" : ""}
                          {availableProviders.includes(id) && !hasCompat ? " (incompatible)" : ""}
                        </option>
                      );
                    })}
                  </StyledSelect>
                  <StyledSelect
                    value={sel.modelId}
                    onChange={(v) => setFeatureOverride(feature, { providerId: sel.providerId, modelId: v })}
                  >
                    {compatibleForSelected.map((m) => (
                      <option key={m.modelId} value={m.modelId}>
                        {m.displayName}{m.supportsVision ? " · Vision" : ""}
                      </option>
                    ))}
                  </StyledSelect>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SettingsContent() {
  const exportAllProjects = useFlashcardStore((s) => s.exportAllProjects);
  const importProjects = useFlashcardStore((s) => s.importProjects);
  const projects = useFlashcardStore((s) => s.projects);
  const refreshOpenRouterCatalog = useFlashcardStore((s) => s.refreshOpenRouterCatalog);
  const openRouterCatalog = useFlashcardStore((s) => s.openRouterCatalog);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!openRouterCatalog) {
      refreshOpenRouterCatalog().catch(() => null);
    }
  }, [openRouterCatalog, refreshOpenRouterCatalog]);

  const handleExport = () => {
    if (projects.length === 0) { toast.info("No projects to export."); return; }
    try {
      const blob = new Blob([exportAllProjects()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `exam-helper-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${projects.length} project(s)`);
    } catch (err) {
      toast.error(`Export failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result as string;
        if (!content) throw new Error("File is empty.");
        const result = importProjects(content);
        if (result.success) toast.success(`${result.count} project(s) imported.`);
        else throw new Error(result.error || "Import failed.");
      } catch (err) {
        toast.error(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        if (importFileInputRef.current) importFileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read file.");
      if (importFileInputRef.current) importFileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-10">
      {/* AI Providers */}
      <section>
        <SectionLabel>AI Providers</SectionLabel>
        <div>
          {PROVIDER_IDS.map((id) => (
            <ProviderCard key={id} providerId={id} />
          ))}
        </div>
      </section>

      {/* Model Routing */}
      <section className="space-y-6">
        <SectionLabel>Model Routing</SectionLabel>
        <DefaultModelPicker />
        <FeatureOverridesSection />
      </section>

      {/* Data */}
      <section>
        <SectionLabel>Data</SectionLabel>
        <p className="text-sm text-muted-foreground mb-4">
          Export your projects as a JSON backup or restore from a previous export.
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleExport} variant="outline" size="sm" disabled={projects.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Export projects
          </Button>
          <Button onClick={() => importFileInputRef.current?.click()} variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" /> Import projects
          </Button>
          <input ref={importFileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />
        </div>
      </section>
    </div>
  );
}
