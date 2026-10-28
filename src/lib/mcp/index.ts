import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listSkillRatings from "./tools/list-skill-ratings";
import listInterviews from "./tools/list-interviews";

// Vite inlines the stable ref; the published SUPABASE_URL may be a proxy.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "project-rescuer",
  title: "Project Rescuer",
  version: "0.1.0",
  instructions:
    "Tools for InterviewVerse interview prep. Read the signed-in user's skill ratings and recent interview sessions to suggest what to practice next.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listSkillRatings, listInterviews],
});
