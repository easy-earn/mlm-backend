import mongoose from "mongoose";
import DBOperation from "./../shared/services/database/database_operation.service.js";
import SchemaMethods from "./../shared/services/database/schema_methods.service.js";
import { encrypt, decrypt } from "./../shared/utils/utility.js";

// mongoose schema
const schema = {
  name: {
    type: String,
    trim: true,
    default: null
  },
  email: {
    type: String,
    trim: true,
    default: null
  },
  phone_number: {
    type: Number,
    required: false,
    trim: true,
    default: null
  },
  password: {
    type: String,
    trim: true,
    required: false,
    select: false,
    default: null,
    set: encrypt,
    get: decrypt,
  },
  status: {
    type: Number, // 0: Inactive, 1: Active
    trim: true,
    required: true,
    default: 1,
  },
  address: {
    type: String,
    trim: true,
    default: null
  },
  city: {
    type: String,
    trim: true,
    default: null
  },
  state: {
    type: String,
    trim: true,
    default: null
  },
  country: {
    type: String,
    trim: true,
    default: null
  },
  countryCode: {
    type: Number,
    trim: true,
    default: null
  },
  zipcode: {
    type: Number,
    trim: true,
    default: null
  },
  is_verified: {
    type: Boolean,
    default: false
  },
  is_terms_accepted: {
    type: Boolean,
    default: false
  },
  referral_code: {
    type: String,
    default: null
  },
  transaction_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserTransaction",
    required: false,
    trim: true,
    default: null
  },
  account_balance: {
    type: Number,
    required: false,
    trim: true,
    default: 0
  },
  account_holder_name: {
    type: String,
    required: false,
    trim: true,
    default: null
  },
  account_number: {
    type: Number,
    required: false,
    trim: true,
    default: null
  },
  ifsc_code: {
    type: String,
    required: false,
    trim: true,
    default: null
  },
  child_count: {
    type: Number,
    required: false,
    trim: true,
    default: 0
  },
  // Used for forgot password
  withdraw_request: {
    type: Boolean,
    required: false,
    default: false,
    trim: true,
    select: false
  },
  forgot_otp: {
    type: String,
    default: "",
    set: encrypt,
    get: decrypt,
  },
  confirmation_otp: {
    type: String,
    trim: true,
    required: false,
    default: "",
    set: encrypt,
    get: decrypt,
  }
};

const modelName = "User";
const UserSchema = DBOperation.createSchema(modelName, schema);

UserSchema.virtual("transaction", {
  ref: 'UserTransaction',
  localField: 'transaction_id',
  foreignField: '_id',
  justOne: true
})

let UserModel = DBOperation.createModel(modelName, UserSchema);
const User = new SchemaMethods(UserModel);
export default User;
