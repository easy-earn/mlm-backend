import { logger, level } from "../config/logger.js";
import Path from "path";
import JWTAuth from "../shared/services/jwt_auth/jwt_auth.service.js";
import { beautify, internalServerError, badRequestError, okResponse, toObjectId, generateRandomString, paramMissingError, SendEmail, parseSearchOptions } from "../shared/utils/utility.js";
import AdminUser from "../models/admin-user.model.js";
import messages from "../shared/constant/messages.const.js";
import User from "../models/user.model.js";
import { returnOnNotExist } from "../shared/services/database/query.service.js";
import pkg from "lodash";
const { _ } = pkg;
const __dirname = Path.resolve();

const auth = new JWTAuth();

export const signUp = async (req, res) => {
  try {
    let data = req.body;
    logger.log(level.info, `AdminSignup : body=${beautify(data)}`);
    let newUser = {
      name: data.name,
      email: data.email,
      phone_number: data.phone_number,
      password: data.password,
      address: data.address,
      city: data.city,
      state: data.state,
      country: data.country,
      zipcode: data.zipcode,
    };
    AdminUser.add(newUser).then(async (resp) => {
      logger.log(level.info, `AdminSignup Added : response=${beautify(resp)}`);
      return okResponse(res, messages.admin_registered_success, resp);
    }, (error) => {
      logger.log(level.error, `AdminSignup Not Added : error=${beautify(error)}`);
      return badRequestError(res, messages.bad_request, error);
    });
  } catch (error) {
    logger.log(level.error, `Admin Signup : Internal Server Error : Error=${beautify(error.message)}`);
    return internalServerError(res, error);
  }
};

export const adminLogin = async (req, res) => {
  try {
    let data = req.body;
    logger.log(level.info, `AdminLogin body : ${beautify(data)}`);
    const filter = { email: data.email, password: data.password };
    let userDoc = await userExist(filter);
    if (userDoc.length > 0) {
      const accessToken = await auth.createAdminToken(data.email, userDoc[0]._id);
      return okResponse(res, messages.login_success, { access_token: accessToken })
    } else {
      return badRequestError(res, messages.admin_missing, null)
    }
  } catch (error) {
    logger.log(level.error, `AdminLogin Error : ${beautify(error.message)}`);
    return internalServerError(res, error)
  }

};

export const getAllUsers = async (req, res) => {
  try {
    const { query } = req;
    const { option = {} } = query;

    logger.log(level.info, `Admin getAllUsers options=${beautify(option)}`);
    const filter = await parseSearchOptions(option);
    logger.log(level.info, `getAllUsers filter=${beautify(filter)}`);
    const users = await User.get(filter, null, option);
    const count = await User.count(filter);
    return okResponse(res, messages.record_fetched, users, count);
  } catch (error) {
    logger.log(level.error, `Admin getAllUsers Error : ${beautify(error.message)}`);
    return internalServerError(res, error)
  }
}

export const getAnalytics = async (req, res) => {
  try {

    const { params } = req;
    logger.log(level.info, `getAnalytics params=${beautify(params)}`);

    return okResponse(res, messages.record_fetched, data);

  } catch (error) {
    logger.log(level.error, `getAnalytics Error: ${beautify(error.message)}`);
    return internalServerError(res, error)
  }
}

async function userExist(filter) {
  let userDoc = await AdminUser.get(filter);
  return userDoc;
}

export const changeUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    logger.log(level.info, `changeUserStatus Params=${req.params}`);

    const isExist = await returnOnNotExist(User, { _id: toObjectId(userId) });
    if (isExist) return;

    await User.update({ _id: toObjectId(userId) }, { status: 0 });

    return okResponse(res, messages.user_status_updated);
  } catch (error) {
    logger.log(level.error, `changeUserStatus Error: ${beautify(error.message)}`);
    return internalServerError(res, error);
  }
}

export const updateProfile = async (req, res) => {
  try {
    const { body } = req;
    const { name = null, address = null, city = null, state = null, country = null, zipcode = null } = body;

    const adminId = req['currentUserId'];
    const payload = {};

    if (name) payload['name'] = name;
    if (address) payload['address'] = address;
    if (city) payload['city'] = city;
    if (state) payload['state'] = state;
    if (country) payload['country'] = country;
    if (zipcode) payload['zipcode'] = zipcode;

    const data = await AdminUser.update({ _id: toObjectId(adminId) }, payload);

    logger.log(level.info, `updateProfile Body=${req.body}`);

    return okResponse(res, messages.updated.replace("{dynamic}", "Profile"), data);
  } catch (error) {
    logger.log(level.error, `updateProfile Error: ${beautify(error.message)}`);
    return internalServerError(res, error);
  }
}