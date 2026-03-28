export const FAQ_ROLES = ["all", "worker", "contractor", "employer"] as const;

export type FaqRole = (typeof FAQ_ROLES)[number];

const ROLE_ALIASES: Record<string, FaqRole> = {
  agency: "contractor",
};

export const normalizeFaqRole = (value?: string | null): FaqRole => {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (!normalized) return "all";

  if (ROLE_ALIASES[normalized]) {
    return ROLE_ALIASES[normalized];
  }

  return (FAQ_ROLES as readonly string[]).includes(normalized)
    ? (normalized as FaqRole)
    : "all";
};

export const normalizeFaqRoleList = (value: unknown): FaqRole[] => {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  const normalized = values
    .map((item) => normalizeFaqRole(String(item)))
    .filter((item, index, self) => self.indexOf(item) === index);

  return normalized.length > 0 ? normalized : ["all"];
};

export const parseStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

export const faqRolesMatch = (
  audiences: FaqRole[] | undefined,
  role?: string | null
): boolean => {
  const normalizedRole = normalizeFaqRole(role);

  if (!audiences || audiences.length === 0) {
    return true;
  }

  if (audiences.includes("all")) {
    return true;
  }

  if (normalizedRole === "all") {
    return audiences.includes("all");
  }

  return audiences.includes(normalizedRole);
};
