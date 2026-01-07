// src/utils/functions/fetchService.ts
interface Service {
  url: string;
  method: string;
  body?: any;
}

export async function fetchService({ url, method, body = null }: Service) {
  const res = await fetch(url, {
    method,
    body, // sigues pasando JSON.stringify(...) desde los services
    credentials: "include", // 👈 importante para GNIO (mandar cookies / sesión)
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  const content = await res.json();
  return content;
}
