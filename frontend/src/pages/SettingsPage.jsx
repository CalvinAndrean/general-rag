import React, { useEffect, useState } from "react";
import { Save, Sliders, Cpu, MessageSquareCode } from "lucide-react";
import { toast } from "sonner";
import { fetchSettings, updateSettings, fetchOpenRouterModels } from "../lib/api";
import { Skeleton } from "../components/ui/Skeleton";
import { CustomSelect } from "../components/ui/CustomSelect";

export function SettingsPage() {
  const [settings, setSettings] = useState({
    llm_model: "anthropic/claude-3.5-sonnet",
    temperature: 0.7,
    max_tokens: 2048,
    system_prompt: "",
    top_k: 4,
  });
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [sData, mData] = await Promise.all([
          fetchSettings(),
          fetchOpenRouterModels().catch(() => []),
        ]);
        setSettings(sData);
        setModels(mData);
      } catch (err) {
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings(settings);
      toast.success("Settings saved successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div className="skeuo-raised p-6 space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="skeuo-raised p-6 space-y-4">
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-3 gap-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const modelOptions = models.map((m) => ({
    value: m.id,
    label: `${m.name || m.id} (${m.id})`,
  }));

  return (
    <div className="w-full space-y-6">
      <form onSubmit={handleSave} className="space-y-6">
        {/* Model Selection */}
        <div className="skeuo-raised p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border-light)] pb-3">
            <Cpu className="h-4 w-4 text-[var(--info)]" />
            <h3 className="text-sm font-bold text-[var(--text-heading)]">Model Selection</h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              LLM Model (OpenRouter)
            </label>
            {modelOptions.length > 0 ? (
              <CustomSelect
                value={settings.llm_model}
                onChange={(val) => setSettings({ ...settings, llm_model: val })}
                options={modelOptions}
                className="w-full"
              />
            ) : (
              <input
                type="text"
                value={settings.llm_model}
                onChange={(e) => setSettings({ ...settings, llm_model: e.target.value })}
                className="skeuo-inset w-full px-3.5 py-2.5 text-xs font-mono"
              />
            )}
            <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
              Select the LLM engine for generating RAG answers via OpenRouter gateway.
            </p>
          </div>
        </div>

        {/* Hyperparameters */}
        <div className="skeuo-raised p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-[var(--border-light)] pb-3">
            <Sliders className="h-4 w-4 text-[var(--info)]" />
            <h3 className="text-sm font-bold text-[var(--text-heading)]">Hyperparameters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Temperature Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Temperature</label>
                <span className="text-xs font-mono font-bold text-[var(--info)] bg-[var(--info-light)] px-2 py-0.5 rounded border border-[var(--info-border)]">
                  {settings.temperature}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={settings.temperature}
                onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 accent-[var(--info)]"
              />
              <div className="flex justify-between items-center text-[10px] text-[var(--text-muted)] font-semibold mt-1.5">
                <span>Focused</span>
                <span>Creative</span>
              </div>
            </div>

            {/* Max Tokens Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Max Tokens</label>
                <span className="text-xs font-mono font-bold text-[var(--info)] bg-[var(--info-light)] px-2 py-0.5 rounded border border-[var(--info-border)]">
                  {settings.max_tokens}
                </span>
              </div>
              <input
                type="range"
                min="256"
                max="8192"
                step="256"
                value={settings.max_tokens}
                onChange={(e) => setSettings({ ...settings, max_tokens: parseInt(e.target.value) })}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 accent-[var(--info)]"
              />
              <div className="flex justify-between items-center text-[10px] text-[var(--text-muted)] font-semibold mt-1.5">
                <span>256</span>
                <span>8192</span>
              </div>
            </div>

            {/* Top K Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Top-K Chunks</label>
                <span className="text-xs font-mono font-bold text-[var(--info)] bg-[var(--info-light)] px-2 py-0.5 rounded border border-[var(--info-border)]">
                  {settings.top_k}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={settings.top_k}
                onChange={(e) => setSettings({ ...settings, top_k: parseInt(e.target.value) })}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 accent-[var(--info)]"
              />
              <div className="flex justify-between items-center text-[10px] text-[var(--text-muted)] font-semibold mt-1.5">
                <span>1 chunk</span>
                <span>20 chunks</span>
              </div>
            </div>
          </div>
        </div>

        {/* System Prompt */}
        <div className="skeuo-raised p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border-light)] pb-3">
            <MessageSquareCode className="h-4 w-4 text-[var(--info)]" />
            <h3 className="text-sm font-bold text-[var(--text-heading)]">System Prompt</h3>
          </div>

          <div>
            <textarea
              rows={4}
              value={settings.system_prompt || ""}
              onChange={(e) => setSettings({ ...settings, system_prompt: e.target.value })}
              placeholder="Leave blank to use default system prompt..."
              className="skeuo-inset w-full p-3 text-xs font-mono"
            />
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Custom instructions prepended to every RAG query prompt.
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="skeuo-btn skeuo-btn-primary px-6 py-2 text-xs flex items-center gap-2 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
