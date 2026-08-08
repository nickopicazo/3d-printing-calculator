import { redirect } from "react-router";

/** Legacy Quotes URLs now live under Projects. */
export async function loader() {
  throw redirect("/projects");
}
