import mongoose from "mongoose";
import { TRANSACTION_TYPE, TRANSACTION_VERIFIED_STATUS } from "../shared/constant/types.const.js";
import DBOperation from "../shared/services/database/database_operation.service.js";
import SchemaMethods from "../shared/services/database/schema_methods.service.js";
import { encrypt, decrypt } from "../shared/utils/utility.js";

// mongoose schema
const schema = {
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    trim: true,
  },
  upi: {
    type: String,
    trim: true,
    required: false,
    default: null
  },
  utr: {
    type: String,
    trim: true,
    required: false,
    default: null
  },
  plan_id: {
    type: String,
    ref: "Plan",
    required: true,
    trim: true,
    default: null
  },
  transaction_type: {
    type: String,
    trim: true,
    required: true,
    enum: [...Object.values(TRANSACTION_TYPE)],
    default: 0,
  },
  is_verified: {
    type: Boolean,
    default: 0,
    enum: [...Object.values(TRANSACTION_VERIFIED_STATUS)]
  }
};

const modelName = "UserTransaction";
const UserTransactionSchema = DBOperation.createSchema(modelName, schema);

UserTransactionSchema.virtual("user", {
  ref: 'User',
  localField: 'user_id',
  foreignField: '_id',
  justOne: true
})

UserTransactionSchema.virtual("plan", {
  ref: 'Plan',
  localField: 'plan_id',
  foreignField: '_id',
  justOne: true
})

let UserTransactionModel = DBOperation.createModel(modelName, UserTransactionSchema);
const UserTransaction = new SchemaMethods(UserTransactionModel);
export default UserTransaction;
