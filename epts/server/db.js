// Database connection (XAMPP MySQL defaults: user root, empty password)
import mysql from "mysql2/promise";

export const DB = {
  host: "localhost",
  user: "root",
  password: "",
  database: "epts_db",
};
export default mysql.createPool({
  ...DB,
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: 5,
});

// Monday of the week that contains the given date, as YYYY-MM-DD
export const monday = (d = new Date()) => {
  const x = new Date(d),
    p = (n) => String(n).padStart(2, "0");
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
};
