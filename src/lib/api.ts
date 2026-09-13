export async function customFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : (input as any).url || "";
  let newInit: RequestInit = init ? { ...init } : {};

  if (url.includes("/api/")) {
    const role = typeof window !== "undefined" ? (localStorage.getItem("demo_selected_role") || "admin") : "admin";
    const existingHeaders = newInit.headers;
    const headersObj: Record<string, string> = {};

    if (typeof Headers !== "undefined" && existingHeaders instanceof Headers) {
      existingHeaders.forEach((val, key) => {
        headersObj[key] = val;
      });
    } else if (Array.isArray(existingHeaders)) {
      existingHeaders.forEach(([key, val]) => {
        headersObj[key] = val;
      });
    } else if (existingHeaders && typeof existingHeaders === "object") {
      Object.assign(headersObj, existingHeaders);
    }

    headersObj["X-Selected-Role"] = role;
    headersObj["X-Selected-Email"] = `${role}@company.com`;
    newInit.headers = headersObj;
  }
  
  return await window.fetch(input, newInit);
}
