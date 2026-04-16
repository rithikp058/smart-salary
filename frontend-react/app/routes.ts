import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("owner-login", "routes/owner-login.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
  route("profile", "routes/profile.tsx"),
  route("salary", "routes/salary.tsx"),
  route("attendance", "routes/attendance.tsx"),
  route("owner", "routes/owner-dashboard.tsx"),
] satisfies RouteConfig;
