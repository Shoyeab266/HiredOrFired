"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { getSettings, saveSettings } from "@/lib/db";
import { INTERVIEWER_NAME } from "@/lib/constants";
import { DURATION_OPTIONS, DEFAULT_SETTINGS, type AppSettings } from "@/types";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const { voices, speak } = useSpeechSynthesis(
    settings.speechRate,
    settings.speechPitch,
    settings.preferredVoiceName
  );

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    await saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestVoice = () => {
    speak(
      `Hello! I'm ${INTERVIEWER_NAME}, your interviewer for HiredOrFired. Good luck with your practice session.`
    );
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center text-slate-500">
        Loading settings...
      </div>
    );
  }

  const englishVoices = voices.filter((v) => v.lang.startsWith("en"));

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">
          Preferences are saved locally in your browser.
        </p>
      </div>

      <Card title="Voice Output" className="mb-6">
        <div className="space-y-5">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.voiceEnabled}
              onChange={(e) =>
                setSettings({ ...settings, voiceEnabled: e.target.checked })
              }
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-slate-700">
              Enable voice output (interviewer speaks questions aloud)
            </span>
          </label>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Speech Rate: {settings.speechRate.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={settings.speechRate}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  speechRate: parseFloat(e.target.value),
                })
              }
              className="w-full accent-brand-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Speech Pitch: {settings.speechPitch.toFixed(1)}
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={settings.speechPitch}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  speechPitch: parseFloat(e.target.value),
                })
              }
              className="w-full accent-brand-600"
            />
          </div>

          {englishVoices.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Voice
              </label>
              <select
                value={settings.preferredVoiceName || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    preferredVoiceName: e.target.value || undefined,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white text-sm"
              >
                <option value="">System default</option>
                {englishVoices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button variant="secondary" size="sm" onClick={handleTestVoice}>
            Test Voice
          </Button>
        </div>
      </Card>

      <Card title="Interview Defaults" className="mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Default Duration
          </label>
          <select
            value={settings.defaultDurationMinutes}
            onChange={(e) =>
              setSettings({
                ...settings,
                defaultDurationMinutes: Number(e.target.value),
              })
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            {DURATION_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d} minutes
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card title="Privacy" className="mb-6">
        <p className="text-sm text-slate-600 leading-relaxed">
          All interview data (transcripts, feedback, settings) is stored
          exclusively in your browser using IndexedDB. Nothing is sent to any
          server except anonymized prompts to the AI provider for generating
          questions and feedback. No accounts, no cloud storage, no tracking.
        </p>
      </Card>

      <Button onClick={handleSave} className="w-full">
        {saved ? "Saved!" : "Save Settings"}
      </Button>
    </div>
  );
}
