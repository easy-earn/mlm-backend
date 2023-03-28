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
    const pipeline = [
        {
            $lookup: {
                'from': 'referusers',
                'localField': '_id',
                'foreignField': 'parent',
                'as': 'child_ref'
            }
        },
        {
            $unwind: {
                'path': '$child_ref',
                'preserveNullAndEmptyArrays': true
            }
        },
        {
            $lookup: {
                'from': 'users',
                'localField': 'child_ref.child',
                'foreignField': '_id',
                'as': 'child'
            }
        },
        {
            $unwind: {
                'path': '$child',
                'preserveNullAndEmptyArrays': true
            }
        },
        {
            $lookup: {
                'from': 'usertransactions',
                'localField': 'child.transaction_id',
                'foreignField': '_id',
                'as': 'transaction'
            }
        },
        {
            $unwind: {
                'path': '$transaction',
                'preserveNullAndEmptyArrays': false
            }
        },
        {
            $match: {
                'transaction.is_verified': true
            }
        },
        {
            $set: {
                'parent_id': '$child_ref.parent'
            }
        },
        {
            $group: {
                '_id': '$parent_id',
                'parent': { '$first': '$$ROOT' },
                'child': { '$sum': 1 }
            }
        },
        {
            $set: {
                'parent.child_count': '$child'
            }
        },
        {
            $replaceRoot: {
                'newRoot': '$parent'
            }
        },
        {
            $unset: ['child_ref', 'transaction', 'child', 'parent_id', 'forgot_otp', 'confirmation_otp', 'is_terms_accepted', 'referral_code', 'withdraw_request', 'is_verified', 'status']
        },
        {
            $sort: { 'child_count': -1 }
        },
        ...insertIf(maxCount != null, { $match: { 'child_count': { '$gte': maxCount } } }),
    ];
    logger.log(level.info, `Pipeline getRewardedUsersPipeline ${beautify(pipeline)}`);
    return { pipeline };
}