// Lab Ops — researcher list derived from the SAME source as the public People
// page (sheetsStatic.members). No duplicate roster is kept for the internal
// tool: ids are stable slugs of the (English) name, and assignments reference
// those ids from project.members.
//
// Public profile data and internal login accounts are intentionally separate
// concepts — researchers do not have accounts.

import { sheetsStatic } from "@/app/data/sheetsStatic";
import { researcherEmails } from "@/app/lab/data/researcherEmails";

export function researcherId(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getResearchers() {
  const rows = Array.isArray(sheetsStatic?.members) ? sheetsStatic.members : [];
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const [category, name, image, role, bio] = row || [];
    const trimmed = String(name || "").trim();
    if (!trimmed) continue;
    const id = researcherId(trimmed);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      name: trimmed,
      category: String(category || "").trim(),
      role: String(role || "").trim(),
      interests: String(bio || "").trim(),
      image: String(image || "").trim(),
      email: String(researcherEmails[id] || "").trim(),
      active: category !== "Alumni" && category !== "Former Advisors",
    });
  }
  return out;
}
