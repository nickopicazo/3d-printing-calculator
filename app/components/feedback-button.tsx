import { MessageSquarePlus } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { openUserJotFeedback } from "~/lib/userjot.client";
import { cn } from "~/lib/utils";

type FeedbackUser = {
  id: string;
  name: string;
  email: string;
} | null;

export function FeedbackButton({
  projectId,
  user,
  className,
  variant = "outline",
  size = "sm",
  fullWidth,
}: {
  projectId: string;
  user: FeedbackUser;
  className?: string;
  variant?: "outline" | "ghost" | "secondary";
  size?: "sm" | "default" | "icon";
  fullWidth?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  if (!projectId) return null;

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      await openUserJotFeedback({ projectId, user });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(fullWidth && "w-full", className)}
      onClick={handleClick}
      disabled={loading}
      aria-busy={loading}
    >
      <MessageSquarePlus />
      {loading ? "Opening…" : "Feedback"}
    </Button>
  );
}
