import HTTPStatus from "http-status";
import { logger, level } from "../../config/logger.js";
import { beautify, unauthorizedError } from "../../shared/utils/utility.js";
import JWTAuth from "../../shared/services/jwt_auth/jwt_auth.service.js";
import { constants } from '../../shared/constant/application.const.js';
import pkg from "lodash";
const { _ } = pkg;

const auth = new JWTAuth();
const tokenLength = 2;
const tokenSplitBy = " ";
const AUTHORIZATION_HEADER_NAME = "authorization";
const VERIFICATION_HEADER_NAME = "x-auth-token"
const CURRENT_USER = "currentUser";
const CURRENT_USER_ID = "currentUserId";
const SKIP_AUTH_FOR = [
    // { method: 'GET', pathName: '/auth/facebook' }
];

export const adminAuthMiddleware = async (req, res, next) => {
    // SKIP AUTHENTICATION
    if (!requireAuth(req.method, req._parsedUrl.pathname)) {
        next();
        return;
    }

    const authorization = req.headers[AUTHORIZATION_HEADER_NAME];
    if (authorization) {
        let token = authorization.split(tokenSplitBy);
        let length = token.length;
        if (length == tokenLength) {
            let accessToken = token[1];
            try {
                let decoded = await auth.verifyAdminToken(accessToken);
                // Enable it for allow user to upload zip
                // let decoded = await auth.verifyToken(accessToken);
                logger.log(
                    level.debug,
                    `adminAuthMiddleware decoded=${JSON.stringify(decoded)}`
                );
                const email = decoded.email;
                const userId = decoded.userId;
                /* eslint-disable require-atomic-updates */
                req[CURRENT_USER] = email;
                req[CURRENT_USER_ID] = userId;
                next();
                return;
            } catch (e) {
                logger.log(level.error, `adminAuthMiddleware ${e}`);
            }
        }
    }
    return unauthorizedError(res);
};

export const authMiddleware = async (req, res, next) => {
    // SKIP AUTHENTICATION
    if (!requireAuth(req.method, req._parsedUrl.pathname)) {
        next();
        return;
    }

    const authorization = req.headers[AUTHORIZATION_HEADER_NAME];
    logger.log(level.info, `req.headers: ${authorization}`);
    if (authorization) {
        let token = authorization.split(tokenSplitBy);
        let length = token.length;
        if (length == tokenLength) {
            let accessToken = token[1];
            try {
                let decoded = await auth.verifyToken(accessToken);
                logger.log(level.debug, `authMiddleware decoded=${JSON.stringify(decoded)}`);
                const email = decoded.email;
                const userId = decoded.userId;
                /* eslint-disable require-atomic-updates */
                req[CURRENT_USER] = email;
                req[CURRENT_USER_ID] = userId;
                next();
                return;
            } catch (e) {
                logger.log(level.error, `authMiddleware ${e}`);
            }
        }
    }
    return unauthorizedError(res)
};

const requireAuth = (method, pathName) => {
    const found = _.find(SKIP_AUTH_FOR, (o) => {
        return o.method == method && o.pathName == pathName;
    });
    return found == undefined ? true : false;
};
