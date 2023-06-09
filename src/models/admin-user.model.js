import DBOperation from "./../shared/services/database/database_operation.service.js";
import SchemaMethods from "./../shared/services/database/schema_methods.service.js";
import { encrypt, decrypt } from "./../shared/utils/utility.js";

// mongoose schema
const schema = {
  name: {
    type: String,
    trim: true,
    default: "",
  },
  email: {
    type: String,
    unique: true,
    required: [true, "Email is required!"],
    trim: true
  },
  password: {
    type: String,
    trim: true,
    required: [true, "Password is required!"],
    select: false,
    set: encrypt,
    get: decrypt,
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
  },
  is_verified: {
    type: Boolean,
    default: false
  },
};
const modelName = "Admin";
const AdminSchema = DBOperation.createSchema(modelName, schema);
let AdminModel = DBOperation.createModel(modelName, AdminSchema);
const Admin = new SchemaMethods(AdminModel);
export default Admin;
