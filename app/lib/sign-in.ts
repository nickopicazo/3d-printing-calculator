/** Search param that opens the sign-in modal over the current page. */
export const SIGN_IN_PARAM = "signin";

/** Absolute location for server redirects and bookmarks (`/login` → this). */
export function signInLocation(redirectTo = "/"): string {
  const params = new URLSearchParams({ [SIGN_IN_PARAM]: "1" });
  if (redirectTo && redirectTo !== "/") {
    params.set("redirectTo", redirectTo);
  }
  return `/?${params.toString()}`;
}

/** Merge `signin=1` into the current search string (no leading `?`). */
export function withSignInSearch(currentSearch = ""): string {
  const params = new URLSearchParams(
    currentSearch.startsWith("?") ? currentSearch.slice(1) : currentSearch,
  );
  params.set(SIGN_IN_PARAM, "1");
  return params.toString();
}

/** Remove sign-in modal params from a search string. */
export function clearSignInSearch(currentSearch = ""): string {
  const params = new URLSearchParams(
    currentSearch.startsWith("?") ? currentSearch.slice(1) : currentSearch,
  );
  params.delete(SIGN_IN_PARAM);
  params.delete("redirectTo");
  const next = params.toString();
  return next ? `?${next}` : "";
}
