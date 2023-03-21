import express from "express";
import "./config/database.js";
import "./shared/utils/utility.js";
import middlewaresConfig from "./config/middlewares.js";
import ApiRoutes from "./routes/index.js";
import path from "path";
import { constants } from "./shared/constant/application.const.js";
import logger, { level } from "./config/logger.js";
// import './cron/generic_reminders.js';

const __dirname = path.resolve();
const app = express();
middlewaresConfig(app);

app.set('views', path.join(__dirname, "src", "views"));
app.set("view engine", "ejs");
app.use(express.static('src/public'));

app.use("/api", ApiRoutes);

app.listen(constants.PORT, () => {
    logger.log(level.info, `SERVER RUNNING ON PORT ${constants.PORT}`)
});

export default app;
