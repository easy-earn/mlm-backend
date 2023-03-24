import { Router } from "express";
import AuthRoutes from "./auth.route.js";
import AdminRoutes from "./admin.route.js";
import UserRoutes from "./user.route.js";

const routes = new Router();
const Path = {
  auth: "/auth",
  admin: "/admin",
  user: "/user"
};

routes.use(Path.admin, AdminRoutes);
routes.use(Path.auth, AuthRoutes);
routes.use(Path.user, UserRoutes);


export default routes;
