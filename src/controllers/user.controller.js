import messages from "../shared/constant/messages.const.js";
import { logger, level } from "../config/logger.js";
import { internalServerError, beautify, okResponse } from "../shared/utils/utility.js";
import User from "../models/user.model.js";
import { returnOnNotExist } from "../shared/services/database/query.service.js";

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