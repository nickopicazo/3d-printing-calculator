import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { FilamentLine } from "~/lib/pricing";
import type { AppSettings } from "~/lib/settings";
import type { PlateImport } from "~/lib/gcode/loadFromArchive";

export type SaveQuoteClient = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

export type SaveQuoteProject = {
  id: string;
  clientId: string;
  name: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userLoggedIn: boolean;
  clients: SaveQuoteClient[];
  projects: SaveQuoteProject[];
  titleDefault: string;
  settings: AppSettings;
  filaments: FilamentLine[];
  printMinutes: number;
  sourceName: string | null;
  plates: PlateImport[];
  metadataSnapshot: Record<string, unknown> | null;
};

export function SaveQuoteDialog({
  open,
  onOpenChange,
  userLoggedIn,
  clients,
  projects,
  titleDefault,
  settings,
  filaments,
  printMinutes,
  sourceName,
  plates,
  metadataSnapshot,
}: Props) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(titleDefault);
  const [clientMode, setClientMode] = useState<"existing" | "new">(
    clients.length > 0 ? "existing" : "new",
  );
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [projectMode, setProjectMode] = useState<"none" | "existing" | "new">(
    "none",
  );
  const [projectId, setProjectId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(titleDefault);
      setError(null);
    }
  }, [open, titleDefault]);

  const clientProjects = useMemo(
    () => projects.filter((p) => p.clientId === clientId),
    [projects, clientId],
  );

  async function onSave() {
    if (!userLoggedIn) {
      navigate(`/login?redirectTo=${encodeURIComponent("/")}`);
      return;
    }
    if (!title.trim()) {
      setError("Quote title is required.");
      return;
    }
    if (clientMode === "new" && !clientName.trim()) {
      setError("Client name is required.");
      return;
    }
    if (clientMode === "existing" && !clientId) {
      setError("Pick a client or create a new one.");
      return;
    }

    setError(null);
    const res = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        clientMode,
        clientId: clientMode === "existing" ? clientId : null,
        clientName,
        clientEmail,
        clientPhone,
        projectMode,
        projectId: projectMode === "existing" ? projectId : null,
        projectName,
        sourceName,
        settings,
        filaments,
        printMinutes,
        plates: plates.map((p) => ({
          plateIndex: p.plateIndex,
          sliced: p.sliced,
          printMinutes: p.totalMinutes,
          imageDataUrl: p.imageDataUrl,
          metadata: p.metadata,
          filaments: p.filaments,
        })),
        metadataSnapshot: metadataSnapshot ?? {},
      }),
    });

    let payload: { id?: string; error?: string; ok?: boolean } = {};
    try {
      payload = (await res.json()) as typeof payload;
    } catch {
      /* ignore */
    }

    if (!res.ok || !payload.id) {
      setError(payload.error ?? "Could not save quote.");
      return;
    }

    onOpenChange(false);
    navigate(`/quotes/${payload.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Save quote</DialogTitle>
          <DialogDescription>
            Attach client details and an optional project. Totals and plate
            images are stored as a snapshot.
          </DialogDescription>
        </DialogHeader>

        {!userLoggedIn ? (
          <p className="text-sm text-[var(--color-ink-muted)]">
            Sign in with Google to save quotes to your account.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="quote-title">Quote title</Label>
              <Input
                id="quote-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <Label>Client</Label>
              <Select
                value={clientMode}
                onValueChange={(v) => setClientMode(v as "existing" | "new")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {clients.length > 0 ? (
                    <SelectItem value="existing">Existing client</SelectItem>
                  ) : null}
                  <SelectItem value="new">New client</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {clientMode === "existing" ? (
              <div>
                <Label>Select client</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-3">
                  <Label>Name</Label>
                  <Input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Phone</Label>
                  <Input
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div>
              <Label>Project</Label>
              <Select
                value={projectMode}
                onValueChange={(v) =>
                  setProjectMode(v as "none" | "existing" | "new")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {clientMode === "existing" && clientProjects.length > 0 ? (
                    <SelectItem value="existing">Existing project</SelectItem>
                  ) : null}
                  <SelectItem value="new">New project</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {projectMode === "existing" ? (
              <div>
                <Label>Select project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose project" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {projectMode === "new" ? (
              <div>
                <Label>Project name</Label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Ice cream cones batch"
                />
              </div>
            ) : null}

            {error ? <p className="text-sm text-[#a33b2b]">{error}</p> : null}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void onSave()}>
            {userLoggedIn ? "Save quote" : "Sign in to save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
