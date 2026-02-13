// src/utils/functions/fetchService.ts
interface Service {
  url: string;
  method: string;
  body?: any;
}

export async function fetchService({ url, method, body = null }: Service) {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  // Fallback: enviar contexto multi-tenant desde la URL actual si existe
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    let tenant =
      params.get("tenant") ||
      params.get("tenantSlug") ||
      params.get("tenant_slug") ||
      "";

    const empresaParam =
      params.get("empresa_id") ||
      params.get("empresaId") ||
      params.get("empresa") ||
      "";

    let empresaId = empresaParam;
    if (!empresaId) {
      const parts = window.location.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("empresas");
      if (idx >= 0 && parts[idx + 1]) {
        empresaId = parts[idx + 1];
      }
      if (!tenant) {
        const idxTenant = parts.indexOf("contador");
        if (idxTenant >= 0 && parts[idxTenant + 1]) {
          tenant = parts[idxTenant + 1];
        }
      }
    }

    if (tenant) headers["x-tenant-slug"] = tenant;
    if (empresaId) headers["x-empresa-id"] = empresaId;
  }

  const res = await fetch(url, {
    method,
    body, // sigues pasando JSON.stringify(...) desde los services
    credentials: "include", // 👈 importante para GNIO (mandar cookies / sesión)
    headers,
  });

  const content = await res.json();
  return content;
}
