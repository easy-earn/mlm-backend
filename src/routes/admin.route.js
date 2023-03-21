import { Router } from "express";

import { signUp, adminLogin, getAllUsers, getAnalytics, updateProfile } from "../controllers/admin.controller.js";
import { adminAuthMiddleware } from "../shared/middleweres/auth.middlewere.js";

const routes = new Router();

const Path = {
  login: "/login",
  register: "/register",
  changeStatus: "/user/status/:userId",
  updateProfile: "/profile-update",

  getAllUsers: "/users",
  getAnalytics: "/analytics",
};

routes.post(Path.register, signUp);
routes.post(Path.login, adminLogin);

routes.use(adminAuthMiddleware);

routes.get(Path.getAnalytics, getAnalytics);
routes.get(Path.getAllUsers, getAllUsers);
routes.put(Path.updateProfile, updateProfile);

export default routes;
