// Every call to the server goes through this one function
let token = localStorage.getItem("epts-token") || "";
export const setToken = (t) => {
  token = t;
  t
    ? localStorage.setItem("epts-token", t)
    : localStorage.removeItem("epts-token");
};

export async function api(path, method = "GET", body) {
  const res = await fetch("/api" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: "Bearer " + token }),
    },
    body: body && JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}
