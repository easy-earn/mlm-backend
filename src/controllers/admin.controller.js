import { logger, level } from "../config/logger.js";
import Path from "path";
import JWTAuth from "../shared/services/jwt_auth/jwt_auth.service.js";
import { beautify, internalServerError, badRequestError, okResponse, toObjectId, paramMissingError, parseSearchOptions, makeNumericId, SendEmail } from "../shared/utils/utility.js";
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
import httpStatus from "http-status";
import WithdrawTransaction from "../models/withdraw-transaction.model.js";
import { getRewardedUsersPipeline } from "../shared/pipeline/admin.pipeline.js";
const { _ } = pkg;
const __dirname = Path.resolve();

const auth = new JWTAuth();

export const signUp = async (req, res) => {
  try {
    let data = req.body;
    logger.log(level.info, `AdminSignup : body=${beautify(data)} ${data.sec_code}, ${constants.ADMIN_SEC_CODE}`);
    let newUser = {
      name: data.name,
      email: data.email,
      password: data.password,
    };
    if (data?.sec_code == constants.ADMIN_SEC_CODE) {
      let filter = { email: data.email };

      logger.log(level.info, `singup UserFilter: ${beautify(filter)}`);

      const isExist = await returnOnExist(AdminUser, filter, res, "Email", messages.already_exist.replace("{dynamic}", "Email"))
      if (isExist) return;

      AdminUser.add(newUser).then(async (resp) => {
        logger.log(level.info, `AdminSignup Added : response=${beautify(resp)}`);
        if (resp.email) {
          const OTP = await makeNumericId(6);
          logger.log(level.info, `singup generatedOTP=${OTP}`);
          await AdminUser.update({ _id: resp._id }, { confirmation_otp: OTP });
          SendEmail(data.email, "verification", OTP, data?.name || 'There');
        }

        const result = JSON.parse(JSON.stringify(resp))
        delete result['confirmation_otp'];
        delete result['forgot_otp'];
        delete result['password'];
        return okResponse(res, messages.admin_registered_success, result);

      }, (error) => {
        logger.log(level.error, `AdminSignup Not Added : error=${beautify(error)}`);
        return badRequestError(res, messages.bad_request, error);
      });
    } else {
      return badRequestError(res, messages.bad_request);
    }
  } catch (error) {
    logger.log(level.error, `Admin Signup : Internal Server Error : Error=${beautify(error.message)}`);
    return internalServerError(res, error);
  }
};

export const adminLogin = async (req, res) => {
  try {
    let data = req.body;
    logger.log(level.info, `AdminLogin body : ${beautify(data)}`);
    const filter = { email: data.email, password: data.password, is_verified: true };
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

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    logger.log(level.info, `Admin VerifyOTP otp=${otp}`);

    if (!otp) {
      logger.log(level.error, 'Admin VerifyOTP:  no OTP found error')
      return paramMissingError(res, messages.missing_key.replace("{dynamic}", "One Time Password"));
    }
    const filter = { email: email, confirmation_otp: otp };
    const [user] = await AdminUser.get({ email: email });
    const [user_with_otp] = await AdminUser.get(filter);
    logger.log(level.info, `verify OTP User: ${beautify(user)} user_with_otp: ${beautify(user_with_otp)}`);
    const updated = await AdminUser.update(filter, { is_verified: true, confirmation_otp: null });
    logger.log(level.info, `verified OTP User: ${beautify(updated)}`);
    if (updated) {
      return okResponse(res, messages.user_verified_success);
    } else {
      return badRequestError(res, messages.otp_expired);
    }
  } catch (error) {
    logger.log(level.error, `Admin VerifyOTP Error=${error.message}`);
    return internalServerError(res, error);
  }
}

export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    logger.log(level.info, `Admin VerifyOTP email=${email}`);

    const filter = { email };

    const notExist = await returnOnNotExist(AdminUser, filter, res, "Admin User", messages.not_exist.replace("{dynamic}", "Admin User"));
    if (notExist) return;

    const [user] = await AdminUser.get(filter);
    const OTP = await makeNumericId(6);
    await AdminUser.update(filter, { confirmation_otp: OTP });
    await SendEmail(email, "verification", OTP, `${user?.name} (Admin)` || 'There');
    return okResponse(res, messages.email_sent);
  } catch (error) {
    logger.log(level.error, `Admin resendOTP Error=${error.message}`);
    return internalServerError(res, error);
  }
}

export const forgotPassword = async (req, res) => {

  try {
    let data = req.body;
    logger.log(level.info, `Admin forgotPassword Body : ${beautify(data)}`)

    let userData = await userExist({ email: data.email });
    if (userData.length > 0) {
      logger.log(level.info, `Admin forgot account: ${beautify(userData)}`);
      const OTP = await makeNumericId(6);
      const mail = await SendEmail(data.email || userData[0].email, "forgot_password", OTP, userData[0]?.name || "There");
      if (mail) {
        var insertForgotOTP = {
          forgot_otp: OTP
        }
        await AdminUser.update({ email: data.email || userData[0].email }, insertForgotOTP);
        return okResponse(res, messages.email_sent, null);
      } else {
        return badRequestError(res, messages.mail_not_sent, null);
      }
    } else {
      return badRequestError(res, messages.user_missing, null, httpStatus.NOT_FOUND)
    }
  } catch (error) {
    logger.log(level.error, `Admin forgotPassword Error=${beautify(error.message)}`);
    return internalServerError(res, error);
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { email, password, otp } = req.body;
    const body = { password: password.toString() }
    logger.log(level.info, `Admin update password body: ${beautify(body)}`);
    const isExist = await userExist({ email: email, password: password });
    if (isExist && isExist.length > 0) {
      return okResponse(res, messages.password_already_updated, null);
    }
    var updated = await AdminUser.update({ email: email, forgot_otp: otp }, body);
    if (updated) {
      await AdminUser.update({ email: email }, { forgot_otp: '' });
      return okResponse(res, messages.updated.replace("{dynamic}", "Password"), null);
    } else {
      return badRequestError(res, messages.wrong_email_otp);
    }
  } catch (e) {
    res.send({ status: 400, error: e.message })
  }
}

export const getAllUsers = async (req, res) => {
  try {
    const { query } = req;
    const { option = {} } = query;
    /**
     * Sample Search Parameters;
     * 
     * option[offset] = 0 
     * option[limit]=100
     * option[sort][name]=-1
     * option[search][countryCode][like]=91
     * option[search][email][eq]=patelanish1609 @gmail.com
     * option[searchBy]=AND
     */

    logger.log(level.info, `Admin getAllUsers options=${beautify(option)}`);
    const filter = await parseSearchOptions(option);
    logger.log(level.info, `getAllUsers filter=${beautify(filter)}`);
    const users = await User.get(filter, null, option, { path: 'transaction', populate: { path: 'plan' } });
    const count = await User.count(filter);
    return okResponse(res, messages.record_fetched, users, count);
  } catch (error) {
    logger.log(level.error, `Admin getAllUsers Error : ${beautify(error.message)}`);
    return internalServerError(res, error)
  }
}

// Not In Use
export const getRewardedUsers = async (req, res) => {
  try {
    const { query } = req;
    const { childCount = null } = query;
    logger.log(level.info, `Admin getRewardedUsers childCount=${beautify(+childCount)}`);
    var verifiedTransactionUsers = await UserTransaction.get({ is_verified: true }, { user_id: 1 })
    verifiedTransactionUsers = verifiedTransactionUsers.map(item => item.user_id);
    console.log('verifiedTransactionUsers', verifiedTransactionUsers);
    const rewardedUser = await getRewardedUsersPipeline(verifiedTransactionUsers || [], childCount ? +childCount : null);
    const users = await ReferUser.aggregate(rewardedUser.pipeline);
    return okResponse(res, messages.record_fetched, users || []);
  } catch (error) {
    logger.log(level.error, `Admin getRewardedUsers Error : ${beautify(error.message)}`);
    return internalServerError(res, error)
  }
}

export const getAllTransactions = async (req, res) => {
  try {
    const { query } = req;
    const { option = {} } = query;

    logger.log(level.info, `Admin getAllTransactions options=${beautify(option)}`);
    const filter = await parseSearchOptions(option);
    logger.log(level.info, `getAllTransactions filter=${beautify(filter)}`);
    const transactions = await UserTransaction.get(filter, null, option, { path: 'user plan' });
    const count = await UserTransaction.count(filter);
    return okResponse(res, messages.record_fetched, transactions, count);
  } catch (error) {
    logger.log(level.error, `Admin getAllTransactions Error : ${beautify(error.message)}`);
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
    const { status } = req.body;

    logger.log(level.info, `changeUserStatus Params=${req.params}`);

    const isExist = await returnOnNotExist(User, { _id: toObjectId(userId) });
    if (isExist) return;

    await User.update({ _id: toObjectId(userId) }, { status: status });

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
      if (updated) {
        var [ref] = await ReferUser.get({ child: transaction_verified.user_id }, null, null, { path: 'parent_doc' });
        logger.log(level.info, `parent user: ${beautify(ref)}`);
        if (ref && ref?.parent_doc) {
          ref = JSON.parse(JSON.stringify(ref));
          await User.update({ _id: ref.parent_doc.user_id }, { $inc: { child_count: 1 } })
        }
      }
      // await calculateCommisionForParentOld(transaction_verified.user_id);
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

export const withdrawBalance = async (req, res) => {
  var transaction;
  try {
    const { body } = req;
    const { user_id } = body;
    logger.log(level.info, `withdrawBalance body=${beautify(body)}`);

    const filter = { _id: user_id, is_verified: TRANSACTION_VERIFIED_STATUS.TRUE };
    const isExist = await returnOnNotExist(User, filter, res, "Verified User", messages.already_exist.replace("{dynamic}", "Verified User"));
    if (isExist) return;

    const [user] = await User.get(filter);
    const backup_amount = user?.account_balance;
    if (user.account_balance >= constants.WITHDRAW_LIMIT) {
      transaction = await WithdrawTransaction.add({ user_id: user_id, amount: user.account_balance });
      if (transaction) {
        const updated = User.update(filter, { withdraw_request: false, account_balance: 0 });
        if (updated) {
          await SendEmail(user.email, "amount_withdrawed", backup_amount, `${user?.name}` || 'There');
          return okResponse(res, messages.amount_withdrawen);
        } else {
          await WithdrawTransaction.delete({ _id: transaction._id });
          return badRequestError(res, messages.transaction_not_withdraw);
        }
      } else {
        return badRequestError(res, messages.internal_server_error);
      }
    } else {
      return badRequestError(res, messages.not_sufficient_amount, { not_sufficient_amount: true });
    }
  } catch (error) {
    if (transaction) await WithdrawTransaction.delete({ _id: transaction._id });
    logger.log(level.error, `withdrawBalance Error: ${beautify(error.message)}`);
    return internalServerError(res, error)
  }
}

async function updateTransactionIdIntoUser(user_id, transaction_id, transaction_verified) {
  const udpated_user = await User.update({ _id: user_id }, { transaction_id: transaction_id })
  return udpated_user;
}

// async function calculateCommisionForParentOld(user_id) {
//   try {
//     logger.log(level.info, `Transaction verification function userID=${user_id}`);
//     const transaction = await UserTransaction.get({ is_verified: TRANSACTION_VERIFIED_STATUS.TRUE, user_id: user_id })
//     logger.log(level.info, `Transaction Record=${beautify(transaction)}`);
//     if (transaction && transaction.length > 0) {
//       const [plan] = await Plan.get({ _id: transaction[0].plan_id });
//       logger.log(level.info, `Plan Record=${beautify(plan)}`);
//       const ref = await ReferUser.get({ child: user_id });
//       logger.log(level.info, `Ref Record=${beautify(ref)}`);
//       if (ref && ref.length > 0) {
//         const parentId = ref[0].parent;
//         logger.log(level.info, `parentId Record=${parentId}`);
//         const [parent] = await User.get({ _id: parentId });
//         logger.log(level.info, `parent Record=${beautify(parent)}`);
//         const oldBalance = parent?.account_balance;
//         logger.log(level.info, `parent Old Balance Record=${oldBalance}`);
//         const newBalance = parent?.account_balance + (plan.amount * COMMISION_PERCENTAGE.PARENT / 100)
//         logger.log(level.info, `parent New Balance Record=${newBalance}`);
//         const updatedParent = await User.update({ _id: parentId }, { account_balance: newBalance })
//         logger.log(level.info, `updated-Parent-Percent Old Balance: ${oldBalance}, New Balance: ${newBalance}`);
//         logger.log(level.info, `updated-Parent-Percent $updated=${beautify(updatedParent)}`);
//         const grandRef = await ReferUser.get({ child: parentId })
//         logger.log(level.info, `GrandeRef Record=${beautify(grandRef)}`);
//         if (grandRef && grandRef.length > 0) {
//           const grandparentId = grandRef[0].parent;
//           logger.log(level.info, `GrandeRef Parent Id Record=${grandparentId}`);
//           const [grandParent] = await User.get({ _id: grandparentId });
//           logger.log(level.info, `GrandeRef Parent Record=${beautify(grandParent)}`);
//           const oldGrandBalance = grandParent?.account_balance;
//           logger.log(level.info, `GrandeRef Parent Old balance Record=${beautify(oldGrandBalance)}`);
//           const newGrandBalance = grandParent.account_balance + (plan.amount * COMMISION_PERCENTAGE.GRAND_PARENT / 100)
//           logger.log(level.info, `GrandeRef Parent New balance Record=${beautify(newGrandBalance)}`);
//           const updatedGrandParent = await User.update({ _id: grandparentId }, { account_balance: newGrandBalance })
//           logger.log(level.info, `updated-Grand-Parent-Percent Old Balance: ${oldGrandBalance}, New Balance: ${newGrandBalance}, Updated: ${beautify(updatedGrandParent)}`);
//           logger.log(level.info, `updated-Grand-Parent-Percent Updated: ${beautify(updatedGrandParent)}`);
//         }
//       }
//     } else {
//       return null;
//     }
//   } catch (error) {
//     console.log('Transaction verification error', error);
//   }
// }


// No Cashback Flow + Dynamic Profit
// async function calculateCommisionForParent(user_id) {
//   try {
//     logger.log(level.info, `Transaction verification function userID=${user_id}`);
//     const transaction = await UserTransaction.get({ is_verified: TRANSACTION_VERIFIED_STATUS.TRUE, user_id: user_id })
//     logger.log(level.info, `Transaction Record=${beautify(transaction)}`);
//     if (transaction && transaction.length > 0) {
//       // plan = childPlan
//       const [childPlan] = await Plan.get({ _id: transaction[0].plan_id });
//       const childPlanAmount = childPlan.amount;
//       logger.log(level.info, `Plan Record=${beautify(childPlan)}`);
//       const ref = await ReferUser.get({ child: user_id });
//       logger.log(level.info, `Ref Record=${beautify(ref)}`);
//       if (ref && ref.length > 0) {
//         const parentId = ref[0].parent;
//         logger.log(level.info, `parentId Record=${parentId}`);
//         // need parent plan
//         const [parent] = await User.get({ _id: parentId }, null, null, { path: 'transaction', populate: { path: 'plan' } });
//         const parentPlanAmount = parent?.transaction?.plan?.amount;
//         if (parent && parentPlanAmount) {
//           logger.log(level.info, `parent Record=${beautify(parent)}`);
//           logger.log(level.info, `parent Plan Amount=${beautify(parentPlanAmount)}`);

//           const oldBalance = parent?.account_balance;
//           logger.log(level.info, `parent Old Balance Record=${oldBalance}`);

//           var baseAmount = childPlanAmount;
//           if (childPlanAmount > parentPlanAmount) {
//             baseAmount = parentPlanAmount;
//           }
//           logger.log(level.info, `Parent BaseAmount Record=${beautify(baseAmount)}`);
//           const newBalance = parent?.account_balance + (baseAmount * COMMISION_PERCENTAGE.PARENT / 100)
//           logger.log(level.info, `parent New Balance Record=${newBalance}`);

//           const updatedParent = await User.update({ _id: parentId }, { account_balance: newBalance })
//           logger.log(level.info, `updated-Parent-Percent Old Balance: ${oldBalance}, New Balance: ${newBalance}`);
//           logger.log(level.info, `updated-Parent-Percent $updated=${beautify(updatedParent)}`);
//           const grandRef = await ReferUser.get({ child: parentId })
//           logger.log(level.info, `GrandeRef Record=${beautify(grandRef)}`);
//           if (grandRef && grandRef.length > 0) {
//             const grandparentId = grandRef[0].parent;
//             logger.log(level.info, `GrandeRef Parent Id Record=${grandparentId}`);
//             const [grandParent] = await User.get({ _id: grandparentId }, null, null, { path: 'transaction', populate: { path: 'plan' } });
//             const grandParentPlanAmount = grandParent?.transaction?.plan?.amount;
//             logger.log(level.info, `GrandeRef Parent Record=${beautify(grandParent)}`);
//             logger.log(level.info, `parent Plan Amount=${beautify(grandParentPlanAmount)}`);
//             if (grandParent && grandParentPlanAmount) {
//               const oldGrandBalance = grandParent?.account_balance;
//               logger.log(level.info, `GrandeRef Parent Old balance Record=${beautify(oldGrandBalance)}`);
//               var baseAmount = childPlanAmount;
//               if (childPlanAmount > grandParentPlanAmount) {
//                 baseAmount = grandParentPlanAmount;
//               }
//               logger.log(level.info, `GrandeRef Parent BaseAmount Record=${beautify(baseAmount)}`);
//               const newGrandBalance = grandParent.account_balance + (baseAmount * COMMISION_PERCENTAGE.GRAND_PARENT / 100)
//               logger.log(level.info, `GrandeRef Parent New balance Record=${beautify(newGrandBalance)}`);
//               const updatedGrandParent = await User.update({ _id: grandparentId }, { account_balance: newGrandBalance })
//               logger.log(level.info, `updated-Grand-Parent-Percent Old Balance: ${oldGrandBalance}, New Balance: ${newGrandBalance}, Updated: ${beautify(updatedGrandParent)}`);
//               logger.log(level.info, `updated-Grand-Parent-Percent Updated: ${beautify(updatedGrandParent)}`);
//             }
//           }
//         }
//       } else {
//         logger.log(level.error, `Transaction verification error error=Parent Not Found`);
//       }
//     } else {
//       logger.log(level.error, `Transaction verification error error=Transaction Not Found`);
//       return null;
//     }
//   } catch (error) {
//     logger.log(level.error, `Transaction verification error error=${beautify(error)}`);
//   }
// }


// Cashback + Dynamic Profit

async function calculateCommisionForParent(user_id) {
  try {
    logger.log(level.info, `Transaction verification function userID=${user_id}`);
    const transaction = await UserTransaction.get({ is_verified: TRANSACTION_VERIFIED_STATUS.TRUE, user_id: user_id })
    logger.log(level.info, `Transaction Record=${beautify(transaction)}`);
    if (transaction && transaction.length > 0) {
      // plan = childPlan
      const [childPlan] = await Plan.get({ _id: transaction[0].plan_id });
      const childPlanAmount = childPlan.amount;
      logger.log(level.info, `Plan Record=${beautify(childPlan)}`);

      // Cashback To User 
      const [user] = await User.get({ _id: user_id });
      if (user) {
        const withCashbackAmount = user.account_balance + (childPlanAmount * 10 / 100);
        await User.update({ _id: user_id }, { account_balance: withCashbackAmount });
      }

      const ref = await ReferUser.get({ child: user_id });
      logger.log(level.info, `Ref Record=${beautify(ref)}`);
      if (ref && ref.length > 0) {
        const parentId = ref[0].parent;
        logger.log(level.info, `parentId Record=${parentId}`);
        // need parent plan
        const [parent] = await User.get({ _id: parentId }, null, null, { path: 'transaction', populate: { path: 'plan' } });
        const parentPlanAmount = parent?.transaction?.plan?.amount;
        if (parent && parentPlanAmount) {
          logger.log(level.info, `parent Record=${beautify(parent)}`);
          logger.log(level.info, `parent Plan Amount=${beautify(parentPlanAmount)}`);

          const oldBalance = parent?.account_balance;
          logger.log(level.info, `parent Old Balance Record=${oldBalance}`);

          var baseAmount = childPlanAmount;
          if (childPlanAmount > parentPlanAmount) {
            baseAmount = parentPlanAmount;
          }
          logger.log(level.info, `Parent BaseAmount Record=${beautify(baseAmount)}`);
          const newBalance = parent?.account_balance + (baseAmount * COMMISION_PERCENTAGE.PARENT / 100)
          logger.log(level.info, `parent New Balance Record=${newBalance}`);

          const updatedParent = await User.update({ _id: parentId }, { account_balance: newBalance })
          logger.log(level.info, `updated-Parent-Percent Old Balance: ${oldBalance}, New Balance: ${newBalance}`);
          logger.log(level.info, `updated-Parent-Percent $updated=${beautify(updatedParent)}`);
          const grandRef = await ReferUser.get({ child: parentId })
          logger.log(level.info, `GrandeRef Record=${beautify(grandRef)}`);
          if (grandRef && grandRef.length > 0) {
            const grandparentId = grandRef[0].parent;
            logger.log(level.info, `GrandeRef Parent Id Record=${grandparentId}`);
            const [grandParent] = await User.get({ _id: grandparentId }, null, null, { path: 'transaction', populate: { path: 'plan' } });
            const grandParentPlanAmount = grandParent?.transaction?.plan?.amount;
            logger.log(level.info, `GrandeRef Parent Record=${beautify(grandParent)}`);
            logger.log(level.info, `parent Plan Amount=${beautify(grandParentPlanAmount)}`);
            if (grandParent && grandParentPlanAmount) {
              const oldGrandBalance = grandParent?.account_balance;
              logger.log(level.info, `GrandeRef Parent Old balance Record=${beautify(oldGrandBalance)}`);
              var baseAmount = childPlanAmount;
              if (childPlanAmount > grandParentPlanAmount) {
                baseAmount = grandParentPlanAmount;
              }
              logger.log(level.info, `GrandeRef Parent BaseAmount Record=${beautify(baseAmount)}`);
              const newGrandBalance = grandParent.account_balance + (baseAmount * COMMISION_PERCENTAGE.GRAND_PARENT / 100)
              logger.log(level.info, `GrandeRef Parent New balance Record=${beautify(newGrandBalance)}`);
              const updatedGrandParent = await User.update({ _id: grandparentId }, { account_balance: newGrandBalance })
              logger.log(level.info, `updated-Grand-Parent-Percent Old Balance: ${oldGrandBalance}, New Balance: ${newGrandBalance}, Updated: ${beautify(updatedGrandParent)}`);
              logger.log(level.info, `updated-Grand-Parent-Percent Updated: ${beautify(updatedGrandParent)}`);
            }
          }
        }
      } else {
        logger.log(level.error, `Transaction verification error error=Parent Not Found`);
      }
    } else {
      logger.log(level.error, `Transaction verification error error=Transaction Not Found`);
      return null;
    }
  } catch (error) {
    logger.log(level.error, `Transaction verification error error=${beautify(error)}`);
  }
}