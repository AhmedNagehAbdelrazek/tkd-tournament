const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('./Models/index');
const apiRouter = require('./Routes/index');
const globalErrorHandler = require('./middlewares/globalErrorHandler');

function createApp() {
  const app = express();

  app.use(cors());
  app.use(helmet());
  app.use(morgan('short'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/', (req, res) => {
    res.send('Hello to TKD Server');
  });
  app.use('/api/v1', apiRouter);  

  app.use(globalErrorHandler);

  return app;
}

module.exports = createApp;
