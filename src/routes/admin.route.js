import { Router } from "express";

import { signUp, adminLogin, getAllUsers, getAnalytics, updateProfile, getPlan, createPlan, updatePlan, deletePlan, verifyUserPurchase } from "../controllers/admin.controller.js";
import { adminAuthMiddleware } from "../shared/middleweres/auth.middlewere.js";

const routes = new Router();

const Path = {
  login: "/login",
  register: "/register",
  changeStatus: "/user/status/:userId",
  updateProfile: "/profile-update",

  getAllUsers: "/users",
  getAnalytics: "/analytics",

  getPlan: "/plan",
  createPlan: "/plan",
  updatePlan: "/plan/:planId",
  deletePlan: "/plan/:planId",

  verifyUserPurchase: "/verify-user-purchase",
};

routes.post(Path.register, signUp);
routes.post(Path.login, adminLogin);

routes.use(adminAuthMiddleware);

routes.get(Path.getAnalytics, getAnalytics);
routes.get(Path.getAllUsers, getAllUsers);
routes.put(Path.updateProfile, updateProfile);

routes.get(Path.getPlan, getPlan);
routes.post(Path.createPlan, createPlan);
routes.put(Path.updatePlan, updatePlan);
routes.delete(Path.deletePlan, deletePlan);

routes.post(Path.verifyUserPurchase, verifyUserPurchase);


export default routes;
