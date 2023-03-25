import mongoose from "mongoose";
import DBOperation from "../shared/services/database/database_operation.service.js";
import SchemaMethods from "../shared/services/database/schema_methods.service.js";

// mongoose schema
const schema = {
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
    trim: true
  }
};

const modelName = "WithdrawTransaction";
const WithdrawTransactionSchema = DBOperation.createSchema(modelName, schema);

WithdrawTransactionSchema.virtual("user", {
  ref: 'User',
  localField: 'user_id',
  foreignField: '_id',
  justOne: true
})

let WithdrawTransactionModel = DBOperation.createModel(modelName, WithdrawTransactionSchema);
const WithdrawTransaction = new SchemaMethods(WithdrawTransactionModel);
export default WithdrawTransaction;
