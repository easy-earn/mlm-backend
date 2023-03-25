import messages from "../shared/constant/messages.const.js";
import { logger, level } from "../config/logger.js";
import { internalServerError, beautify, okResponse, badRequestError } from "../shared/utils/utility.js";
import User from "../models/user.model.js";
import { returnOnNotExist } from "../shared/services/database/query.service.js";
import * as planPurchaseJSONSchema from "../ajv-schema/plan-purchase-form.schema.json" assert { type: "json" };
import Ajv from 'ajv';
import addFormats from "ajv-formats";
import addErrors from "ajv-errors";
import { TRANSACTION_TYPE, TRANSACTION_VERIFIED_STATUS } from "../shared/constant/types.const.js";
import UserTransaction from "../models/user-transaction.model.js";
import Plan from "../models/plan.model.js";
import ReferUser from "../models/refer_user.model.js";
const ajv = new Ajv({ $data: true, allErrors: true });
addFormats(ajv);
addErrors(ajv);
const upiTransactionValidator = ajv.compile(planPurchaseJSONSchema);

export const removeAccount = async (req, res) => {
  try {
    const deletedCondition = { $or: [{ is_deleted: false }, { is_deleted: { $exists: false } }] }
    const filter = { _id: req['currentUserId'], ...deletedCondition };
    const notExist = await returnOnNotExist(User, filter, res, "User", messages.not_exist.replace("{dynamic}", "User"));
    if (notExist) return;

    const user = await User.update(filter, { is_deleted: true, deleted_at: new Date().toISOString() });
    return okResponse(res, messages.deleted.replace("{dynamic}", "User"), user);
  }
  catch (error) {
    logger.log(level.error, `removeAccount Error: ${beautify(error.message)}`);
    return internalServerError(res, error);
  }
}

export const upiPurchase = async (req, res) => {
  try {
    let data = req.body;
    logger.log(level.info, `upiPurchase Data: ${beautify(data)}`);
    const isValid = await upiTransactionValidator(data);
    console.log('isValid', isValid);
    const [plan] = await Plan.get({ _id: data.plan_id });
    const [existingTransaction] = await UserTransaction.get({ user_id: req['currentUserId'] });
    const bankbody = {
      account_holder_name: data?.account_holder_name,
      account_number: data?.bank_account_number,
      ifsc_code: data?.ifsc_code
    }
    const updatedUser = await User.update({ _id: req['currentUserId'] }, bankbody);
    logger.log(level.info, `upi-purchase bank detial updated: ${beautify(updatedUser)}`);
    if (!existingTransaction) {
      if (plan) {
        const transaction = {
          user_id: req['currentUserId'],
          upi: data?.upi,
          utr: data?.utr,
          plan_id: plan._id,
          transaction_type: TRANSACTION_TYPE.UPI,
          is_verified: TRANSACTION_VERIFIED_STATUS.FALSE
        }
        const newTransaction = await UserTransaction.add(transaction);
        if (newTransaction) {
          return okResponse(res, messages.created.replace("{dynamic}", 'Transaction'), newTransaction)
        } else {
          return internalServerError(res);
        }
      } else {
        return badRequestError(res, messages.not_exist.repeat("{dynamic}", 'Plan'));
      }
    } else {
      return badRequestError(res, messages.plan_already_purchased);
    }
  } catch (error) {
    logger.log(level.error, `upiPurchase : Internal server error : ${beautify(error.message)}`)
    return internalServerError(res, error.message)
  }
}

export const getMyProfile = async (req, res) => {
  try {
    logger.log(level.info, `getMyProfile`);
    const [user] = await User.get({ _id: req['currentUserId'] }, null, null, { path: 'transaction', populate: { path: 'plan_id' } });
    if (user) {
      const [pendingTransaction] = await UserTransaction.get({ user_id: req['currentUserId'] })
      const object = JSON.parse(JSON.stringify(user));
      //  No transaction id means no manual verification done by admin.
      if (pendingTransaction) {
        if (pendingTransaction.is_verified == TRANSACTION_VERIFIED_STATUS.FALSE || !object?.transaction_id) {
          // Do nothing
          object['payment_verification_pending'] = true;
          delete object.referral_code;
        }
      } else {
        delete object.referral_code;
      }
      delete object.forgot_otp;
      delete object.confirmation_otp;
      return okResponse(res, messages.record_fetched, JSON.parse(JSON.stringify(object)))
    } else {
      return badRequestError(res, messages.user_missing);
    }
  } catch (error) {
    logger.log(level.error, `getMyProfile : Internal server error : ${beautify(error.message)}`)
    return internalServerError(res, error.message)
  }
}

export const getMyChildUsers = async (req, res) => {
  try {
    const { query } = req;
    const { option = {} } = query;
    logger.log(level.info, `getMyChildUsers`);
    const currentUser = req['currentUserId'];
    const refs = await ReferUser.get({ parent: currentUser });
    const childs = refs.map(item => item.child);
    var childUsers = [], count = 0;
    if (childs.length > 0) {
      childUsers = await User.get({ _id: { $in: [...childs] } }, null, option, { path: 'transaction', populate: { path: 'plan' } });
      count = await User.count({ _id: { $in: [...childs] } }, null, option);
    }
    return okResponse(res, messages.record_fetched, childUsers, count)
  } catch (error) {
    logger.log(level.error, `getMyChildUsers : Internal server error : ${beautify(error.message)}`)
    return internalServerError(res, error.message)
  }
}

export const sendWithdrawalRequest = async (req, res) => {
  try {
    const updated = await User.update({ _id: req['currentUserId'] }, { withdraw_request: true });
    if (updated) {
      return okResponse(res, messages.email_sent, null);
    } else {
      return internalServerError(res, messages.internal_server_error);
    }
  } catch (error) {
    logger.log(level.error, `sendWithdrawalRequest : Internal server error : ${beautify(error.message)}`)
    return internalServerError(res, error.message)
  }
}