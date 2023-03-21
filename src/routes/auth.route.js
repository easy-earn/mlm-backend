import { Router } from "express";
import { signUp, login, forgotPassword, getUserByID, updatePassword, resetPasswordLinkExpirePage, passwordUpdatedPage, resetPasswordPage, passwordUpdateFailedPage, updateUserDetail, verifyOTP, resendOTP } from "../controllers/authentication.controller.js";
import { authMiddleware } from "../shared/middleweres/auth.middlewere.js";

const routes = new Router();
const Path = {
  login: "/login",
  register: "/register",
  verifyOTP: "/verifyOTP",
  resendOTP: "/resendOTP",
  forgotPassword: "/forgot-password",
  userByID: "/user",
  updatePassword: "/update-password",
  updateUserDetail: "/user",

  // Pages
  resetPasswordPage: "/:email/password/:time/:mailid/:tc",
  resetPasswordLinkExpiredPage: "/users/link/expired",
  passwordUpdatedPage: "/users/:email/success",
  passwordUpdateFailedPage: "/users/:email/failure"
};

// Pages
routes.get(Path.resetPasswordPage, resetPasswordPage);
routes.get(Path.resetPasswordLinkExpiredPage, resetPasswordLinkExpirePage);
routes.get(Path.passwordUpdatedPage, passwordUpdatedPage);
routes.get(Path.passwordUpdateFailedPage, passwordUpdateFailedPage);

routes.post(Path.register, signUp);
routes.post(Path.verifyOTP, verifyOTP);
routes.post(Path.resendOTP, resendOTP);
routes.post(Path.login, login);
routes.post(Path.forgotPassword, forgotPassword);
routes.post(Path.updatePassword, updatePassword);

// Auth Token Gateway
routes.use(authMiddleware);

routes.put(Path.updateUserDetail, updateUserDetail);
routes.get(Path.userByID, getUserByID);

export default routes;
