const winston = require('winston');

const options = {
  file: {
    level: 'warn',
    filename: `${__dirname}../../logs/app.log`,
    handleExceptions: true,
    json: true,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    colorize: false,
  },
  console: {
    level: 'debug',
    handleExceptions: true,
    json: false,
    colorize: true,
  }
}

winston.addColors({
  error: 'red',
  warn: 'yellow',
  info: 'cyan',
  debug: 'green'
});

var logger = new winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.prettyPrint(),
    winston.format.colorize()
  ),
  transports: [
    new winston.transports.File(options.file),
    new winston.transports.Console(options.console)
  ],
  exitOnError: false, // do not exit on handled exceptio  ns
});

logger.stream = {
  write: function(message, encoding) {
    logger.info(message);
  },
};


module.exports = logger;