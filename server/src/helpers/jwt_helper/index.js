const jwt = require('jsonwebtoken');
const { SECRET } = require('../../config');

module.exports = function (token) {

  return new Promise((resolve, reject) => {

    jwt.verify(token, SECRET, { algorithms: ['HS256'] }, (err, res) => {
      if (err)
        reject(err.message);
      else
        resolve(res);
    });

  });

}
