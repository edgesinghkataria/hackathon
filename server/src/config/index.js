let DB_NAME = 'gmkchat';
let MONGO_URL = `mongodb+srv://nodeapi_user:1RjsPNe3uSmQYbmz@gamingmonk-chat-orgnu.mongodb.net/${DB_NAME}?retryWrites=true&w=majority`;
const createMongoURL = () => MONGO_URL;
const MAX_BUCKET_SIZE = 30;

if (true || process.env.NODE_ENV === 'development') {
  DB_NAME = process.env.DB_NAME || 'chatApp';
  MONGO_URL = `mongodb://localhost/chatApp`
}

console.log(MONGO_URL);
module.exports = {
  PORT: process.env.PORT,
  createMongoURL,
  MAX_BUCKET_SIZE,
}
