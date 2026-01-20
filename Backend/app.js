const express = require("express");
const cors = require("cors");
const Bookingroute = require("./src/routes/booking.routes");
const Assignroute = require("./src/routes/assign.routes");
const Respondroute = require("./src/routes/respond.routes");
const CompleteStartRoute = require("./src/routes/Complete-Start.routes");
const CancelFailRoute = require("./src/routes/cancle-fail.routes");
const Adminroute = require("./src/routes/Admin.routes");
const Historyroute = require("./src/routes/history.routes");
const Providerroute = require("./src/routes/provider.routes");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

app.use('/', Bookingroute);
app.use('/',Assignroute);
app.use('/', Respondroute);
app.use('/',CompleteStartRoute);
app.use('/', CancelFailRoute);
app.use('/',Adminroute);
app.use('/',Historyroute);
app.use('/',Providerroute);

module.exports = app;