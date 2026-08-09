type UserJotIdentify = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};

type UserJotApi = {
  init: (
    projectId: string,
    options?: {
      widget?: boolean;
      theme?: "light" | "dark" | "auto";
      position?: "left" | "right";
      trigger?: "default" | "custom";
    },
  ) => void;
  identify: (user: UserJotIdentify) => void;
  showWidget: (options?: { section?: "feedback" | "roadmap" | "changelog" }) => void;
  hideWidget?: () => void;
};

declare global {
  interface Window {
    $ujq?: unknown[];
    uj?: UserJotApi;
  }
}

let scriptPromise: Promise<void> | null = null;
let initializedFor: string | null = null;

function ensureQueueStub() {
  window.$ujq = window.$ujq || [];
  if (!window.uj) {
    window.uj = new Proxy({} as UserJotApi, {
      get(_target, prop) {
        return (...args: unknown[]) => {
          window.$ujq?.push([prop, ...args]);
        };
      },
    });
  }
}

function loadSdk(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  if (document.getElementById("userjot-sdk")) {
    scriptPromise = Promise.resolve();
    return scriptPromise;
  }

  ensureQueueStub();
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = "userjot-sdk";
    script.type = "module";
    script.async = true;
    script.src = "https://cdn.userjot.com/sdk/v2/uj.js";
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Failed to load UserJot SDK"));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

function splitName(name: string): { firstName: string; lastName?: string } {
  const trimmed = name.trim();
  const space = trimmed.indexOf(" ");
  if (space === -1) return { firstName: trimmed };
  return {
    firstName: trimmed.slice(0, space),
    lastName: trimmed.slice(space + 1).trim() || undefined,
  };
}

export async function openUserJotFeedback(options: {
  projectId: string;
  user?: { id: string; name: string; email: string } | null;
}) {
  const { projectId, user } = options;
  if (!projectId) return;

  await loadSdk();
  ensureQueueStub();

  if (initializedFor !== projectId) {
    window.uj?.init(projectId, {
      widget: true,
      theme: "auto",
      trigger: "custom",
    });
    initializedFor = projectId;
  }

  if (user) {
    const { firstName, lastName } = splitName(user.name);
    window.uj?.identify({
      id: user.id,
      email: user.email,
      firstName,
      lastName,
    });
  }

  window.uj?.showWidget({ section: "feedback" });
}
