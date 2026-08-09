import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type { ProjectDraft } from "~/lib/calculator-types";
import { createSharePayload } from "~/lib/landing-preset";
import type { AppSettings } from "~/lib/settings";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: AppSettings;
  project: ProjectDraft;
};

export function ShareCalculationDialog({
  open,
  onOpenChange,
  settings,
  project,
}: Props) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function createShare() {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const payload = createSharePayload(settings, project);
      const res = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Could not create share link.");
      }
      setUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Share failed.");
      setUrl("");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setUrl("");
          setError(null);
          setCopied(false);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share this calculation</DialogTitle>
          <DialogDescription>
            Create a link anyone can open to view and edit a copy of this
            estimate. The original stays unchanged.
          </DialogDescription>
        </DialogHeader>

        {url ? (
          <div className="space-y-2">
            <Label htmlFor="share-url">Share link</Label>
            <div className="flex gap-2">
              <Input id="share-url" readOnly value={url} className="font-mono text-sm" />
              <Button type="button" variant="outline" onClick={() => void copyLink()}>
                {copied ? <Check /> : <Copy />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-ink-muted)]">
            Links expire after 90 days and are not indexed by search engines.
          </p>
        )}

        {error ? (
          <p className="text-sm text-[#a33b2b]">{error}</p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={() => void createShare()}
          >
            {busy ? "Creating…" : url ? "Create another" : "Create link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
