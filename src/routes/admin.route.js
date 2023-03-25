import { Router } from "express";

import { signUp, adminLogin, getAllUsers, getAnalytics, updateProfile, getPlan, createPlan, updatePlan, deletePlan, verifyUserPurchase, verifyOTP, resendOTP, forgotPassword, updatePassword, getAllTransactions, withdrawBalance } from "../controllers/admin.controller.js";
import { adminAuthMiddleware } from "../shared/middleweres/auth.middlewere.js";

const routes = new Router();

const Path = {
  login: "/login",
  register: "/register",
  verifyOTP: "/verifyOTP",
  resendOTP: "/resendOTP",
  forgotPassword: "/forgot-password",
  updatePassword: "/update-password",
  changeStatus: "/user/status/:userId",
  updateProfile: "/profile-update",

  getAllUsers: "/users",
  getAllTransactions: "/transactions",
  getAnalytics: "/analytics",

  getPlan: "/plan",
  createPlan: "/plan",
  updatePlan: "/plan/:planId",
  deletePlan: "/plan/:planId",

  verifyUserPurchase: "/verify-user-purchase",
  withdrawBalance: "/withdraw-balance",
};

routes.post(Path.register, signUp);
routes.post(Path.verifyOTP, verifyOTP);
routes.post(Path.resendOTP, resendOTP);
routes.post(Path.login, adminLogin);
routes.post(Path.forgotPassword, forgotPassword);
routes.post(Path.updatePassword, updatePassword);

routes.use(adminAuthMiddleware);

routes.get(Path.getAnalytics, getAnalytics);
routes.get(Path.getAllUsers, getAllUsers);
routes.get(Path.getAllTransactions, getAllTransactions);
routes.put(Path.updateProfile, updateProfile);

routes.get(Path.getPlan, getPlan);
routes.post(Path.createPlan, createPlan);
routes.put(Path.updatePlan, updatePlan);
routes.delete(Path.deletePlan, deletePlan);

routes.post(Path.verifyUserPurchase, verifyUserPurchase);
routes.post(Path.withdrawBalance, withdrawBalance);


export default routes;
