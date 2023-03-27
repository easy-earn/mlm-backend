import logger, { level } from "../../config/logger.js";
import { MODAL_ID } from "../constant/types.const.js";
import { beautify, getPaginationOptions, insertIf } from "../utils/utility.js";

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

export const getRewardedUsersPipeline = (maxCount = null) => {
    logger.log(level.info, `Pipeline getRewardedUsersPipeline maxCount = ${maxCount}`);
    // {
    //     '$match': {
    //         'childCount': {
    //             '$gte': maxCount
    //         }
    //     }
    // }
    const pipeline = [
        {
            '$lookup': {
                'from': 'referusers',
                'localField': '_id',
                'foreignField': 'parent',
                'as': 'children'
            }
        }, {
            '$addFields': {
                'childCount': {
                    '$size': '$children'
                }
            }
        },
        ...insertIf(maxCount != null, { $match: { 'childCount': { '$gte': maxCount } } }),
        {
            '$lookup': {
                'from': 'usertransactions',
                'localField': 'transaction_id',
                'foreignField': '_id',
                'as': 'transaction'
            }
        }, {
            '$unwind': {
                'path': '$transaction',
                'preserveNullAndEmptyArrays': true
            }
        }, {
            '$set': {
                'user_id': '$_id',
                'transaction.usertransaction_id': '$transaction._id'
            }
        }, {
            '$project': {
                'children': 0,
                'password': 0,
                'forgot_otp': 0,
                'confirmation_otp': 0,
                'is_terms_accepted': 0,
                'referral_code': 0,
                'withdraw_request': 0,
                'is_verified': 0,
                'status': 0
            }
        },
        {
            '$sort': {
                'childCount': 1
            }
        }
    ];
    logger.log(level.info, `Pipeline getRewardedUsersPipeline ${beautify(pipeline)}`);
    return { pipeline };
}