import logger, { level } from "../../config/logger.js";
import { MODAL_ID } from "../constant/types.const.js";
import { beautify, getPaginationOptions } from "../utils/utility.js";

export const getCountryWiseUserCount = () => {
    logger.log(level.info, `Pipeline getCountryWiseUserCount`);
    const pipeline = [
        {
            $group: {
                _id: '$country',
                user_count: { $sum: 1 }
            }
        },
        { $set: { country: '$_id' } },
        { $unset: '_id' }
    ];
    logger.log(level.info, `Pipeline getCountryWiseUserCount ${beautify(pipeline)}`);
    return { pipeline };
}