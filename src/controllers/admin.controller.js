import { logger, level } from "../config/logger.js";
import Path from "path";
import JWTAuth from "../shared/services/jwt_auth/jwt_auth.service.js";
import { beautify, internalServerError, badRequestError, okResponse, toObjectId, paramMissingError, parseSearchOptions } from "../shared/utils/utility.js";
import AdminUser from "../models/admin-user.model.js";
import messages from "../shared/constant/messages.const.js";
import User from "../models/user.model.js";
import { returnOnExist, returnOnNotExist } from "../shared/services/database/query.service.js";
import pkg from "lodash";
import Plan from "../models/plan.model.js";
import UserTransaction from "../models/user-transaction.model.js";
import ReferUser from "../models/refer_user.model.js";
import { COMMISION_PERCENTAGE, TRANSACTION_VERIFIED_STATUS } from "../shared/constant/types.const.js";
import { constants } from "../shared/constant/application.const.js";
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
      password: data.password,
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


export const createPlan = async (req, res) => {
  try {
    const { body } = req;
    const { plan_name, amount, sq_id } = body;
    logger.log(level.info, `createPlan body=${beautify(body)}`);

    let payload = { plan_name, amount, sq_id }
    const plan = await Plan.add(payload);
    logger.log(level.info, `createPlan Created: ${beautify(plan)}`);
    return okResponse(res, messages.created.replace("{dynamic}", 'Plan'), plan);
  } catch (error) {
    logger.log(level.error, `createPlan Error: ${beautify(error.message)}`);
    return internalServerError(res, error)
  }
}

export const updatePlan = async (req, res) => {
  try {
    const { body, params } = req;
    const { plan_name, sq_id } = body;
    const { planId } = params;
    logger.log(level.info, `updatePlan body=${beautify(body)} params=${beautify(params)}`);

    const filter = { _id: planId };

    const isNotExist = await returnOnNotExist(Plan, { _id: planId }, res, 'Plan', messages.not_exist.replace("{dynamic}", 'Plan'))
    if (isNotExist) return;

    let payload = {}
    if (plan_name) payload['plan_name'] = plan_name;
    if (sq_id) payload['sq_id'] = sq_id;

    const planbyId = await Plan.get({ _id: planId });
    logger.log(level.info, `planbyId = ${beautify(planbyId)}`);
    const plan = await Plan.update(filter, payload);
    logger.log(level.info, `updatePlan Updated: ${beautify(plan)}`);
    return okResponse(res, messages.updated.replace("{dynamic}", 'Plan'), plan);
  } catch (error) {
    logger.log(level.error, `updatePlan Error: ${beautify(error.message)}`);
    return internalServerError(res, error)
  }
}

export const deletePlan = async (req, res) => {
  try {
    const { params } = req;
    const { planId } = params;

    logger.log(level.info, `deletePlan params=${beautify(params)}`);

    const filter = { _id: planId };
    const plan = await Plan.delete(filter);
    logger.log(level.info, `deletePlan Deleted: ${beautify(plan)}`);
    return okResponse(res, messages.deleted.replace("{dynamic}", 'Plan'), plan);

  } catch (error) {
    logger.log(level.error, `deletePlan Error: ${beautify(error.message)}`);
    return internalServerError(res, error)
  }
}

export const getPlan = async (req, res) => {
  try {

    logger.log(level.info, `getPlan`);

    let plans = await Plan.get();
    logger.log(level.info, `getPlan plans=${beautify(plans)}`);
    let result = JSON.parse(JSON.stringify(plans));
    result = result.map(plan => {
      plan['qr'] = `${constants.ASSET_URL}plans/plan-${plan.amount}.png`;
      return plan;
    })
    logger.log(level.info, `getPlan version: ${beautify(result)}`);
    return okResponse(res, messages.record_fetched, result);

  } catch (error) {
    logger.log(level.error, `getPlan Error: ${beautify(error.message)}`);
    return internalServerError(res, error)
  }
}

export const verifyUserPurchase = async (req, res) => {
  try {
    const { body } = req;
    const { transaction_id } = body;
    logger.log(level.info, `verifyUserPurchase body=${beautify(body)}`);

    const filter = { _id: transaction_id, is_verified: TRANSACTION_VERIFIED_STATUS.TRUE };
    const isExist = await returnOnExist(UserTransaction, filter, res, "Verified Transaction ", messages.already_exist.replace("{dynamic}", "Verified Transaction"));
    if (isExist) return;

    let payload = { is_verified: TRANSACTION_VERIFIED_STATUS.TRUE }
    const transaction_verified = await UserTransaction.update({ _id: transaction_id }, payload);
    logger.log(level.info, `verifyUserPurchase Created: ${beautify(transaction_verified)}`);
    if (transaction_verified) {
      const updated = await updateTransactionIdIntoUser(transaction_verified.user_id, transaction_verified._id, transaction_verified);
      await calculateCommisionForParent(transaction_verified.user_id);
      return okResponse(res, messages.updated.replace("{dynamic}", 'Transaction'), { user: updated, transaction: transaction_verified });
    } else {
      return badRequestError(res, messages.transaction_not_verified);
    }
  } catch (error) {
    logger.log(level.error, `verifyUserPurchase Error: ${beautify(error.message)}`);
    return internalServerError(res, error)
  }
}

async function updateTransactionIdIntoUser(user_id, transaction_id, transaction_verified) {
  const udpated_user = await User.update({ _id: user_id }, { transaction_id: transaction_id })
  return udpated_user;
  // if (udpated_user) {
  //   return okResponse(res, messages.created.replace("{dynamic}", 'Plan'), transaction_verified);
  // } else {
  //   logger.log(level.error, `verifyUserPurchase error= transaction_id : ${transaction_id}`);
  //   return badRequestError(res, messages.transaction_user_not_vefiried);
  // }
}

async function calculateCommisionForParent(user_id) {
  try {
    logger.log(level.info, `Transaction verification function userID=${user_id}`);
    const transaction = await UserTransaction.get({ is_verified: TRANSACTION_VERIFIED_STATUS.TRUE, user_id: user_id })
    logger.log(level.info, `Transaction Record=${beautify(transaction)}`);
    if (transaction && transaction.length > 0) {
      const [plan] = await Plan.get({ _id: transaction[0].plan_id });
      logger.log(level.info, `Plan Record=${beautify(plan)}`);
      const ref = await ReferUser.get({ child: user_id });
      logger.log(level.info, `Ref Record=${beautify(ref)}`);
      if (ref && ref.length > 0) {
        const parentId = ref[0].parent;
        logger.log(level.info, `parentId Record=${parentId}`);
        const [parent] = await User.get({ _id: parentId });
        logger.log(level.info, `parent Record=${beautify(parent)}`);
        const oldBalance = parent?.account_balance;
        logger.log(level.info, `parent Old Balance Record=${oldBalance}`);
        const newBalance = parent?.account_balance + (plan.amount * COMMISION_PERCENTAGE.PARENT / 100)
        logger.log(level.info, `parent New Balance Record=${newBalance}`);
        const updatedParent = await User.update({ _id: parentId }, { account_balance: newBalance })
        logger.log(level.info, `updated-Parent-Percent Old Balance: ${oldBalance}, New Balance: ${newBalance}`);
        logger.log(level.info, `updated-Parent-Percent $updated=${beautify(updatedParent)}`);
        const grandRef = await ReferUser.get({ child: parentId })
        logger.log(level.info, `GrandeRef Record=${beautify(grandRef)}`);
        if (grandRef && grandRef.length > 0) {
          const grandparentId = grandRef[0].parent;
          logger.log(level.info, `GrandeRef Parent Id Record=${grandparentId}`);
          const [grandParent] = await User.get({ _id: grandparentId });
          logger.log(level.info, `GrandeRef Parent Record=${beautify(grandParent)}`);
          const oldGrandBalance = grandParent?.account_balance;
          logger.log(level.info, `GrandeRef Parent Old balance Record=${beautify(oldGrandBalance)}`);
          const newGrandBalance = grandParent.account_balance + (plan.amount * COMMISION_PERCENTAGE.GRAND_PARENT / 100)
          logger.log(level.info, `GrandeRef Parent New balance Record=${beautify(newGrandBalance)}`);
          const updatedGrandParent = await User.update({ _id: grandparentId }, { account_balance: newGrandBalance })
          logger.log(level.info, `updated-Grand-Parent-Percent Old Balance: ${oldGrandBalance}, New Balance: ${newGrandBalance}, Updated: ${beautify(updatedGrandParent)}`);
          logger.log(level.info, `updated-Grand-Parent-Percent Updated: ${beautify(updatedGrandParent)}`);
        }
      }
    } else {
      return null;
    }
  } catch (error) {
    console.log('Transaction verification error', error);
  }
}