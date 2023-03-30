import { logger, level } from "../config/logger.js";
import JWTAuth from "../shared/services/jwt_auth/jwt_auth.service.js";
import { SendEmail, decrypt, beautify, internalServerError, paramMissingError, badRequestError, okResponse, generateRandomString, makeid, makeNumericId, toObjectId } from "../shared/utils/utility.js";
import { REGEX } from "../shared/constant/application.const.js";
import User from "../models/user.model.js";
import ReferUser from "../models/refer_user.model.js";
import { constants as APP_CONST } from "../shared/constant/application.const.js";
import messages from "../shared/constant/messages.const.js";
import { returnOnExist, returnOnNotExist } from "../shared/services/database/query.service.js";
import pkg from "lodash";
import moment from "moment";
import httpStatus from "http-status";

const { _ } = pkg;
const auth = new JWTAuth();
const asset_url = `${APP_CONST.ASSET_URL}`;

export const login = async (req, res) => {
  try {
    let data = req.body;
    logger.log(level.info, `Login Data: ${beautify(data)}`);

    const filter = { email: data.email, password: data.password };
    let userDoc = await userExist(filter);
    if (userDoc.length > 0) {
      if (userDoc[0].status === 1) {
        if (userDoc[0].is_verified == true) {
          const responseData = await generateToken(res, data.email, userDoc[0]);
          return okResponse(res, messages.login_success, responseData);
        } else {
          return badRequestError(res, messages.user_not_verified, { is_verified: false }, httpStatus.NOT_FOUND);
        }
      } else {
        return badRequestError(res, messages.blocked_user, { status: false }, httpStatus.NOT_FOUND);
      }
    } else {
      return badRequestError(res, messages.email_password_not_match, null, httpStatus.NOT_FOUND);
    }
  } catch (error) {
    logger.log(level.error, `Login : Internal server error : ${beautify(error.message)}`)
    return internalServerError(res, error.message)
  }
};

export const signUp = async (request, response) => {
  try {
    const { body } = request;
    let data = body;
    let newUser = {
      name: data.name,
      email: data.email,
      phone_number: data.phone_number,
      password: data.password,
      // BYPASS_OTP : 
      // is_verified: false 
      is_verified: true,
      is_terms_accepted: data.is_terms_accepted,
      status: 1
    };
    logger.log(level.info, `User Registeration Body : ${beautify(data)}`)

    let filter = {};
    data.email ? filter['email'] = data.email : null;
    data.phone_number ? filter['phone_number'] = data.phone_number : null;
    data.email && data.phone_number ? filter = { $or: [{ email: data.email }, { phone_number: data.phone_number }] } : null;

    logger.log(level.info, `singup UserFilter: ${beautify(filter)}`);

    const isExist = await returnOnExist(User, filter, response, "Email Or Phone Number", messages.already_exist.replace("{dynamic}", "Email Or Phone Number"))
    if (isExist) return;

    newUser['referral_code'] = `${await generateRandomString(10)}`;
    User.add(newUser).then(async (resp) => {
      // BYPASS_OTP : 

      // if (resp.email) {
      //   const OTP = await makeNumericId(6);
      //   logger.log(level.info, `singup generatedOTP=${OTP}`);
      //   await User.update({ _id: resp._id }, { confirmation_otp: OTP });
      //   SendEmail(data.email, "verification", OTP, data?.name || 'There');
      // }
      // delete resp['confirmation_otp'];
      // logger.log(level.info, `data= ${JSON.parse(JSON.stringify(data))}`);

      // BYPASS_OTP END 
      await generateReferenceLink(data?.parent_code, newUser?.referral_code, resp?._id);

      const returnData = await generateToken(response, resp.email, resp);
      okResponse(response, messages.register_success, returnData);
      // Generate Ref 
    }, async (error) => {
      logger.log(level.error, `User Registeration Error : ${beautify(error.message)}`)
      return internalServerError(response, error);
    });

  } catch (error) {
    logger.log(level.error, `User Registeration Error Error=${beautify(error.message)}`);
    return internalServerError(response, error);
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    logger.log(level.info, `VerifyOTP otp=${otp}`);

    if (!otp) {
      logger.log(level.error, 'VerifyOTP:  no OTP found error')
      return paramMissingError(res, messages.missing_key.replace("{dynamic}", "One Time Password"));
    }
    const filter = { email: email, confirmation_otp: otp };
    const [user] = await User.get({ email: email });
    const [user_with_otp] = await User.get(filter);
    logger.log(level.info, `verify OTP User: ${beautify(user)} user_with_otp: ${beautify(user_with_otp)}`);
    const updated = await User.update(filter, { is_verified: true, confirmation_otp: null });
    logger.log(level.info, `verified OTP User: ${beautify(updated)}`);
    if (updated) {
      return okResponse(res, messages.user_verified_success);
    } else {
      return badRequestError(res, messages.otp_expired);
    }
  } catch (error) {
    logger.log(level.error, `VerifyOTP Error=${error.message}`);
    return internalServerError(res, error);
  }
}

export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    logger.log(level.info, `VerifyOTP email=${email}`);

    const filter = { email };

    const notExist = await returnOnNotExist(User, filter, res, "User", messages.not_exist.replace("{dynamic}", "User"));
    if (notExist) return;

    const [user] = await User.get(filter);
    const OTP = await makeNumericId(6);
    await User.update(filter, { confirmation_otp: OTP });
    await SendEmail(email, "verification", OTP, user?.name || 'There');

    return okResponse(res, messages.email_sent);
  } catch (error) {
    logger.log(level.error, `resendOTP Error=${error.message}`);
    return internalServerError(res, error);
  }
}

export const updateUserDetail = async (req, res, next) => {
  try {
    const { body, file } = req;
    const { name = null, address = null, city = null, state = null, country = null, countryCode = null, zipcode = null, dob = null, gender = null } = body;

    logger.log(level.info, `updateUserDetail body=${beautify(body)}`);

    const payload = {};
    if (name) payload['name'] = name;
    if (address) payload['address'] = address;
    if (city) payload['city'] = city;
    if (state) payload['state'] = state;
    if (country) payload['country'] = country;
    if (countryCode) payload['countryCode'] = countryCode;
    if (zipcode) payload['zipcode'] = zipcode;
    if (dob) payload['dob'] = dob;
    if (gender) payload['gender'] = gender;

    const filter = { _id: req['currentUserId'] }
    const user = await User.update(filter, payload);
    return await okResponse(res, messages.updated.replace("{dynamic}", "User"), user);
  } catch (error) {
    logger.log(level.error, `updateUserDetail Error: ${beautify(error.message)}`);
    return internalServerError(res, error);
  }
}

export const forgotPassword = async (request, response) => {

  try {
    let data = request.body;
    logger.log(level.info, `forgotPassword Body : ${beautify(data)}`)

    let userData = await userExist({ email: data.email });
    logger.log(level.info, `forgot userData: ${beautify(userData)} name: ${userData[0]?.name}`);

    if (userData.length > 0) {
      const OTP = await makeNumericId(6);
      const mail = await SendEmail(data.email || userData[0].email, "forgot_password", OTP, userData[0]?.name || "There");
      if (mail) {
        var insertForgotOTP = {
          forgot_otp: OTP
        }
        await User.update({ email: data.email || userData[0].email }, insertForgotOTP);
      }
      return okResponse(response, messages.email_sent, null);
    } else {
      return badRequestError(response, messages.user_missing, null, HTTPStatus.NOT_FOUND)
    }
  } catch (error) {
    logger.log(level.error, `forgotPassword Error=${beautify(error.message)}`);
    return internalServerError(response, error);
  }
};

export const phoneExists = async (request, response) => {
  try {
    var data = request.body;
    logger.log(level.info, `phoneExists Body : ${beautify(data)}`)

    var phone_valid = REGEX.phone_number;
    let phone = phone_valid.test(data.phone);

    var country_code = REGEX.country_code;
    let cc = country_code.test(data.country_code);

    if (!phone || !cc) {
      return badRequestError(response, messages.invalid_key.replace("{dynamic}", "Phone Number | Country Code"))
    }

    const filter = { phone_number: data.phone, countryCode: data.country_code };
    let [userDoc] = await User.get(filter);
    if (userDoc) {
      return okResponse(response, messages.phone_exists, true)
    } else {
      return okResponse(response, messages.not_exist.replace("{dynamic}", "Phone Number"), false)
    }
  } catch (error) {
    logger.log(level.error, `phoneExists Error=${beautify(error.message)}`);
    return internalServerError(response, error);
  }
};

export const getUserByID = async (request, response) => {
  try {
    var query_params = request.query;
    logger.log(level.info, `getUserByID Body : ${beautify(query_params)}`)

    let [userData] = await userExist({ _id: query_params.id });
    if (userData) {
      return okResponse(response, messages.user_found, userData)
    } else {
      return okResponse(response, messages.user_missing, null)
    }
  } catch (error) {
    logger.log(level.error, `getUserByID Error=${beautify(error.message)}`);
    return internalServerError(response, error);
  }
};

export const updatePassword = async (request, response) => {
  try {
    const { email, password, otp } = request.body;
    const body = { password: password.toString() }
    logger.log(level.info, `update password body: ${beautify(body)}`);
    const isExist = await userExist({ email: email, password: password });
    if (isExist && isExist.length > 0) {
      return okResponse(response, messages.password_already_updated, null);
    }
    var updated = await User.update({ email: email, forgot_otp: otp }, body);
    if (updated) {
      await User.update({ email: email }, { forgot_otp: '' });
      return okResponse(response, messages.updated.replace("{dynamic}", "Password"), null);
    } else {
      return badRequestError(response, messages.wrong_email_otp);
    }
  } catch (e) {
    response.send({ status: 400, error: e.message })
  }
}

/* Commonly used functions */

// async function authUserForgotPasswordCheckEmail(email, random_string, timestamp) {
//   try {
//     var emailId = await decrypt(email)
//     let [email_with_string_exist] = await User.get({
//       email: emailId,
//       random_string: random_string
//     });
//     logger.log(level.info, `user: ${emailId}, random_string: ${random_string}, email_with_string_exist: ${email_with_string_exist}`);
//     let date = new Date(parseInt(timestamp));
//     var now = new Date();

//     var ms = moment(now, "YYYY-MM-DD HH:mm:ss").diff(moment(date, "YYYY-MM-DD HH:mm:ss"));
//     var data = moment.duration(ms);
//     if (email_with_string_exist && data._data.days < 1) {
//       return true
//     } else {
//       return false
//     }
//   } catch (e) {
//     logger.log(level.error, `Error in Check Mail: ${JSON.stringify(e.message)}`)
//     return false;
//   }
// };

async function updateUserPRODetails(userDoc) {
  const doc = JSON.parse(JSON.stringify(userDoc));
  const trialFilter = {
    user_id: doc.user_id,
    coupon_type: COUPON_TYPE.TRIAL_COUPON,
    coupon_for: COUPON_FOR_WHO.SINGLE_USER,
    is_deleted: false
  }
  logger.log(level.info, `update User's pro details : ${beautify(doc)} CouponFilter: ${beautify(trialFilter)}`);
  const [coupon] = await Coupon.get(trialFilter);
  if (coupon) {
    let date = new Date(doc.trial_redeem_time);
    var now = new Date();

    var ms = moment(now, "YYYY-MM-DD HH:mm:ss").diff(moment(date, "YYYY-MM-DD HH:mm:ss"));
    var data = moment.duration(ms);
    logger.log(level.info, `Difference : ${data._data.days}, Expire (In Day): ${coupon.expire_time}`)
    if (data._data.days <= coupon.expire_time) {
      doc[USER_PRO_STATUS.TRIAL] = true;
      doc[USER_PRO_STATUS.TRIAL_EXPIRED] = false;
    } else {
      doc[USER_PRO_STATUS.TRIAL] = false;
      doc[USER_PRO_STATUS.TRIAL_EXPIRED] = true;
    }
  } else {
    // Coupon not generated yet
    doc[USER_PRO_STATUS.TRIAL] = false;
    doc[USER_PRO_STATUS.TRIAL_EXPIRED] = false;
  }
  return { ...doc };
}

export const checkForTrialEnd = async (req, res) => {
  try {
    let doc = await User.get({ _id: toObjectId(req['currentUserId']) });
    let userDoc = doc.length > 0 ? JSON.parse(JSON.stringify(doc[0])) : null;
    if (userDoc && userDoc.trial_redeem_time) {
      userDoc = await updateUserPRODetails(userDoc)
    } else {
      // Trial not started yet
      userDoc[USER_PRO_STATUS.TRIAL] = false;
      userDoc[USER_PRO_STATUS.TRIAL_EXPIRED] = false;
    }
    return okResponse(res, messages.trial_not_exceeded, { ...userDoc })
  } catch (error) {
    logger.log(level.error, `checkForTrialEnd Error=${beautify(error.message)}`);
    return internalServerError(res, error);
  }
}

function createNewUser(userData) {
  return {
    email: userData.email,
    name: userData.name,
    login_type: userData.login_type,
    status: 1,
    is_verified: userData.is_verified,
    social_id: userData.social_id,
    password: userData.password,
    access_token: userData.access_token,
    profile_image: userData.profile_image,
    role: userData.role,
    is_doctor_consulted: userData.is_doctor_consulted,
    doctor_suggestion: userData.doctor_suggestion || []
  };
}

async function userExist(filter) {
  let userDoc = await User.get({ ...filter });
  return userDoc || [];
}

async function generateToken(response, email, userDoc = null) {
  let doc = JSON.parse(JSON.stringify(userDoc))
  const accessToken = await auth.createToken(email, doc.user_id);
  delete doc?.password;
  delete doc['confirmation_otp'];
  return { access_token: accessToken, userDoc: doc }
}

/**
 * @param parent_code : parent code that is send by new user.
 * @param refferal_code : code that is generated & assigned to new user
 * @param new_user_id: new user ID that is signed up recently.
 * 
 * */
async function generateReferenceLink(parent_code, referral_code, new_user_id) {
  // Find Parent By It's Refferal_code field
  logger.log(level.info, `generateReferenceLink parentUser=${parent_code}`);
  logger.log(level.info, `generateReferenceLink referral_code=${referral_code}`);
  logger.log(level.info, `generateReferenceLink new_user_id=${new_user_id}`);
  // const filter = { refferal_code: parent_code };
  const filter = {
    referral_code: {
      $exists: true, // check if myKey exists
      $ne: null, // check if myKey is not null
      $nin: ['', undefined], // check if myKey is not an empty string or undefined
      $eq: parent_code // check if myKey is equal to 'myValue'
    }
  }
  logger.log(level.info, `generateReferenceLink filter=${beautify(filter)}`);
  const parentUser = await User.get(filter);
  logger.log(level.info, `generateReferenceLink parentUser=${beautify(parentUser)}`);
  if (parentUser && parentUser?.length > 0) {
    const new_link = {
      parent: parentUser[0]._id,
      child: new_user_id,
      parent_code: parent_code,
      child_code: referral_code
    }
    await ReferUser.add(new_link);
  }
}