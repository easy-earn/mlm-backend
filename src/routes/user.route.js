import { Router } from "express";
import { authMiddleware } from "../shared/middleweres/auth.middlewere.js";
import { getMyChildUsers, getMyProfile, sendWithdrawalRequest, upiPurchase } from "../controllers/user.controller.js";
import { getPlan } from "../controllers/admin.controller.js";

const routes = new Router();
const Path = {
    getPlans: '/get-plans',
    upiPurchase: '/upi-purchase',
    getMyProfile: '/get-my-profile',
    getMyChildUsers: '/get-child-users',
    sendWithdrawalRequest: '/withdraw-request'
};

routes.get(Path.getPlans, getPlan);

// Auth Token Gateway
routes.use(authMiddleware);

routes.post(Path.upiPurchase, upiPurchase);
routes.get(Path.getMyProfile, getMyProfile);
routes.get(Path.getMyChildUsers, getMyChildUsers);
routes.get(Path.sendWithdrawalRequest, sendWithdrawalRequest);

export default routes;