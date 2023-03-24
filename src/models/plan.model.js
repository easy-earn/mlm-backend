import DBOperation from "../shared/services/database/database_operation.service.js";
import SchemaMethods from "../shared/services/database/schema_methods.service.js";

// mongoose schema
const schema = {
  plan_name: {
    type: String,
    required: true,
    trim: true,
  },
  sq_id: {
    type: Number,
    required: false,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
    trim: true,
  }
};

const modelName = "Plan";
const PlanSchema = DBOperation.createSchema(modelName, schema);

let PlanModel = DBOperation.createModel(modelName, PlanSchema);
const Plan = new SchemaMethods(PlanModel);
export default Plan;
