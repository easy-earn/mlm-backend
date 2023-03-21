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
    default: ""
  },
  // Used for forgot password
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

let UserModel = DBOperation.createModel(modelName, UserSchema);
const User = new SchemaMethods(UserModel);
export default User;
