// Every call to the server goes through this one function
let token = localStorage.getItem("epts-token") || "";
export const setToken = (t) => {
  token = t;
  t
    ? localStorage.setItem("epts-token", t)
    : localStorage.removeItem("epts-token");
};

export async function api(path, method = "GET", body) {
  let res;
  try {
    res = await fetch("/api" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: "Bearer " + token }),
      },
      body: body && JSON.stringify(body),
    });
  } catch {
    // The server did not answer at all (not running, or no connection)
    const e = new Error(
      "Cannot reach the server. Check that it is running and try again.",
    );
    e.status = 0;
    throw e;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // A 5xx with no message from our API usually means the server or MySQL is not running
    const e = new Error(
      data.error ||
        (res.status >= 500
          ? "The server is not responding. Make sure it is running and MySQL is started in XAMPP, then try again."
          : "Something went wrong. Please try again."),
    );
    e.status = res.status;
    throw e;
  }
  return data;
}
