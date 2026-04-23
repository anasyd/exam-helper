"use client";

import {
  useState,
  useEffect,
  useRef,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  ExternalLink,
  Upload,
  Download,
  CheckCircle2,
  XCircle,
  CircleDashed,
} from "lucide-react";
import { toast } from "sonner";

const PROVIDER_CONSOLE_URLS: Record<ProviderId, string> = {
  gemini: "https://ai.google.dev/",
  openai: "https://platform.openai.com/api-keys",
  anthropic: "https://console.anthropic.com/settings/keys",
  openrouter: "https://openrouter.ai/keys",
};

const FEATURE_LABELS: Record<FeatureId, string> = {
  flashcards: "Flashcards",
  notes: "Notes",
  "study-guide": "Study guide",
  transcript: "Transcript",
  summary: "Summary",
};

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- re-sync local input when persisted key changes externally
    setLocalKey(stored.apiKey ?? "");
  }, [stored.apiKey]);

  const saveKey = () => {
    const trimmed = localKey.trim();
    setProviderKey(providerId, trimmed || null);
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
      toast.success(`${provider.displayName} connection OK`);
    } else {
      setStatus("invalid");
      toast.error(`${provider.displayName} error: ${result.error}`);
    }
  };

  const clearKey = () => {
    setProviderKey(providerId, null);
    setLocalKey("");
    setStatus("unknown");
    toast.info(`${provider.displayName} key cleared`);
  };

  return (
    <div className="border rounded-md p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{provider.displayName}</h3>
        {status === "ok" && (
          <span className="inline-flex items-center gap-1 text-green-600 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" /> Connected
          </span>
        )}
        {status === "invalid" && (
          <span className="inline-flex items-center gap-1 text-red-600 text-xs">
            <XCircle className="h-3.5 w-3.5" /> Invalid
          </span>
        )}
        {status === "unknown" && stored.apiKey && (
          <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
            <CircleDashed className="h-3.5 w-3.5" /> Untested
          </span>
        )}
        {status === "unknown" && !stored.apiKey && (
          <span className="text-muted-foreground text-xs">Not configured</span>
        )}
      </div>
      <Input
        type="password"
        value={localKey}
        onChange={(e) => setLocalKey(e.target.value)}
        placeholder={`${provider.displayName} API key`}
      />
      <div className="flex gap-2 items-center flex-wrap">
        <Button onClick={saveKey} size="sm">
          Save
        </Button>
        <Button
          onClick={testKey}
          size="sm"
          variant="outline"
          disabled={!localKey.trim() || testing}
        >
          {testing ? "Testing…" : "Test connection"}
        </Button>
        {stored.apiKey && (
          <Button onClick={clearKey} size="sm" variant="ghost">
            Clear
          </Button>
        )}
        <a
          href={PROVIDER_CONSOLE_URLS[providerId]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1 ml-auto"
        >
          Get a key <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function DefaultModelPicker() {
  const selection = useFlashcardStore((s) => s.modelRouting.default);
  const setDefaultModel = useFlashcardStore((s) => s.setDefaultModel);
  const providers = useFlashcardStore((s) => s.providers);

  const availableProviders = PROVIDER_IDS.filter((id) => providers[id].apiKey);
  const modelsForProvider = catalog.listForProvider(selection.providerId);

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Default model</h3>
      <p className="text-sm text-muted-foreground">
        Used for every feature without a specific override.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <select
          value={selection.providerId}
          onChange={(e) => {
            const providerId = e.target.value as ProviderId;
            const first = catalog.listForProvider(providerId)[0];
            if (first) setDefaultModel({ providerId, modelId: first.modelId });
          }}
          className="border rounded px-2 py-1 bg-background text-sm"
        >
          {PROVIDER_IDS.map((id) => (
            <option key={id} value={id} disabled={!availableProviders.includes(id)}>
              {getProvider(id).displayName}
              {!availableProviders.includes(id) ? " (no key)" : ""}
            </option>
          ))}
        </select>
        <select
          value={selection.modelId}
          onChange={(e) =>
            setDefaultModel({ providerId: selection.providerId, modelId: e.target.value })
          }
          className="border rounded px-2 py-1 bg-background text-sm"
        >
          {modelsForProvider.map((m) => (
            <option key={m.modelId} value={m.modelId}>
              {m.displayName} · {m.supportsVision ? "Vision" : "Text"}
            </option>
          ))}
        </select>
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
      <h3 className="font-semibold">Per-feature overrides</h3>
      <p className="text-sm text-muted-foreground">
        Optional. Toggle a feature to route it to a model different from the default. Incompatible
        models are filtered out per feature.
      </p>
      {FEATURE_IDS.map((feature) => {
        const sel = overrides[feature];
        const compatible = listCompatibleModels(feature);
        const compatibleForSelected = sel
          ? compatible.filter((m) => m.providerId === sel.providerId)
          : [];
        return (
          <div key={feature} className="border rounded p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{FEATURE_LABELS[feature]}</span>
              <label className="text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!sel}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const first = compatible.find((m) =>
                        availableProviders.includes(m.providerId)
                      );
                      if (first) {
                        setFeatureOverride(feature, {
                          providerId: first.providerId,
                          modelId: first.modelId,
                        });
                      } else {
                        toast.error(
                          "No compatible model available among configured providers for this feature."
                        );
                      }
                    } else {
                      setFeatureOverride(feature, null);
                    }
                  }}
                />
                Override
              </label>
            </div>
            {sel && (
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={sel.providerId}
                  onChange={(e) => {
                    const providerId = e.target.value as ProviderId;
                    const first = compatible.find((m) => m.providerId === providerId);
                    if (first) {
                      setFeatureOverride(feature, { providerId, modelId: first.modelId });
                    }
                  }}
                  className="border rounded px-2 py-1 bg-background text-sm"
                >
                  {PROVIDER_IDS.map((id) => {
                    const hasCompat = compatible.some((m) => m.providerId === id);
                    return (
                      <option
                        key={id}
                        value={id}
                        disabled={!availableProviders.includes(id) || !hasCompat}
                      >
                        {getProvider(id).displayName}
                        {!availableProviders.includes(id) ? " (no key)" : ""}
                        {availableProviders.includes(id) && !hasCompat ? " (incompatible)" : ""}
                      </option>
                    );
                  })}
                </select>
                <select
                  value={sel.modelId}
                  onChange={(e) =>
                    setFeatureOverride(feature, {
                      providerId: sel.providerId,
                      modelId: e.target.value,
                    })
                  }
                  className="border rounded px-2 py-1 bg-background text-sm"
                >
                  {compatibleForSelected.map((m) => (
                    <option key={m.modelId} value={m.modelId}>
                      {m.displayName} · {m.supportsVision ? "Vision" : "Text"}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface AppSettingsProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AppSettings({ open: externalOpen, onOpenChange: externalOnOpenChange }: AppSettingsProps = {}) {
  const exportAllProjects = useFlashcardStore((s) => s.exportAllProjects);
  const importProjects = useFlashcardStore((s) => s.importProjects);
  const projects = useFlashcardStore((s) => s.projects);
  const refreshOpenRouterCatalog = useFlashcardStore((s) => s.refreshOpenRouterCatalog);
  const openRouterCatalog = useFlashcardStore((s) => s.openRouterCatalog);

  const [internalOpen, setInternalOpen] = useState(false);
  const isDialogOpen = externalOpen ?? internalOpen;
  const setIsDialogOpen = (v: boolean) => {
    setInternalOpen(v);
    externalOnOpenChange?.(v);
  };
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Kick off OpenRouter catalog fetch once, silently
  useEffect(() => {
    if (!openRouterCatalog) {
      refreshOpenRouterCatalog().catch(() => {
        // intentional no-op; OpenRouter list just stays empty if it fails
      });
    }
  }, [openRouterCatalog, refreshOpenRouterCatalog]);

  const handleExport = () => {
    if (projects.length === 0) {
      toast.info("No projects to export.");
      return;
    }
    try {
      const jsonData = exportAllProjects();
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      link.download = `flashcard_projects_backup_${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${projects.length} project(s)`);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export projects.", {
        description:
          error instanceof Error ? error.message : "An unknown error occurred.",
      });
    }
  };

  const handleImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result as string;
        if (!content) {
          throw new Error("File content is empty.");
        }
        const result = importProjects(content);
        if (result.success) {
          toast.success(`${result.count} project(s) imported successfully.`);
        } else {
          throw new Error(result.error || "Import failed.");
        }
      } catch (err) {
        toast.error(
          `Import failed: ${err instanceof Error ? err.message : String(err)}`
        );
      } finally {
        if (importFileInputRef.current) importFileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read the import file.");
      if (importFileInputRef.current) importFileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      {externalOpen === undefined && (
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Settings">
            <Settings className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Application Settings</DialogTitle>
          <DialogDescription>
            Configure AI providers, per-feature models, and project data.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="providers" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="providers">Providers</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
          </TabsList>

          <TabsContent value="providers" className="space-y-4 pt-4">
            {PROVIDER_IDS.map((id) => (
              <ProviderCard key={id} providerId={id} />
            ))}
          </TabsContent>

          <TabsContent value="models" className="space-y-4 pt-4">
            <DefaultModelPicker />
            <Separator />
            <FeatureOverridesSection />
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />

        <div className="space-y-3">
          <h3 className="font-semibold">Project Data Management</h3>
          <p className="text-sm text-muted-foreground">
            Export all projects to a backup file or import previously-exported projects.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              disabled={projects.length === 0}
            >
              <Download className="h-4 w-4 mr-2" /> Export all projects
            </Button>
            <Button
              onClick={() => importFileInputRef.current?.click()}
              variant="outline"
              size="sm"
            >
              <Upload className="h-4 w-4 mr-2" /> Import projects
            </Button>
            <input
              ref={importFileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => setIsDialogOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
