import { Router } from "express";
import { } from "../controllers/user.controller.js";
import { authMiddleware } from "../shared/middleweres/auth.middlewere.js";

const routes = new Router();
const Path = {
};

// Auth Token Gateway
routes.use(authMiddleware);

export default routes;