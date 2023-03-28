import DBOperation from "../shared/services/database/database_operation.service.js";
import SchemaMethods from "../shared/services/database/schema_methods.service.js";
import mongoose from "mongoose";

// mongoose schema
const schema = {
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    trim: true,
  },
  child: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    trim: true,
  },
  parent_code: {
    type: String,
    required: false,
    trim: true
  },
  child_code: {
    type: String,
    required: false,
    trim: true
  }
};

const modelName = "ReferUser";
const ReferUserSchema = DBOperation.createSchema(modelName, schema);
ReferUserSchema.virtual("parent_doc", {
  ref: 'User',
  localField: 'parent',
  foreignField: '_id',
  justOne: true
})

ReferUserSchema.virtual("child_doc", {
  ref: 'User',
  localField: 'child',
  foreignField: '_id',
  justOne: true
})

let ReferUserModel = DBOperation.createModel(modelName, ReferUserSchema);
const ReferUser = new SchemaMethods(ReferUserModel);
export default ReferUser;
