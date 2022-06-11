const mongoose = require('mongoose');
const { GroupSchema, UserSchema, GroupChatSchema, P2PSchema } = require('../schemas/mongo-schema');
const { createMongoURL } = require('../config');

// let GMChatApp = mongoose.createConnection(createMongoURL('gmchat'), { useNewUrlParser: true })

GroupSchema.methods.getGroups = function () {
  return new Promise((resolve, reject) => {
    this.model('groups').find((err, res) => {
      if (err)
        reject(err)
      else
        resolve(res)
    });
  })

}


GroupSchema.methods.insertGroup = function (data) {

  return new Promise((resolve, reject) => {
    const GroupModel = GMChatApp.model('groups', GroupSchema);
    new GroupModel(data).save((err, res) => {
      if (err)
        reject(err)
      else
        resolve()
    })
  })

}


GroupSchema.methods.getAGroup = function (cond) {
  return new Promise((resolve, reject) => {
    this.model('groups').findOne(cond, (err, res) => {
      if (err)
        reject(err)
      else
        resolve(res)
    });
  })

}


GroupSchema.methods.insertOrUpdateGroup = function (cond, data) {
  return new Promise((resolve, reject) => {
    this.model('groups').updateOne(cond, data, { upsert: true }, (err, res) => {
      if (err)
        reject(err)
      else
        resolve(res)
    });
  })

}


UserSchema.methods.createUser = function (data) {
  return new Promise((resolve, reject) => {
    const UserModel = GMChatApp.model('users', UserSchema);
    new UserModel(data).save((err, res) => {
      if (err)
        reject(err)
      else
        resolve(res)
    })
  })

}


UserSchema.methods.getAUser = function (cond) {
  return new Promise((resolve, reject) => {
    this.model('users').findOne(cond, (err, res) => {
      if (err)
        reject(err)
      else
        resolve(res)
    });
  })

}


// UserSchema.methods.insertUserToBlockList = function (cond) {
//   return new Promise((resolve, reject) => {
//     this.model('blocklist').updateOne(cond, (err, res) => {
//       if (err)
//         reject(err)
//       else
//         resolve(res)
//     });
//   })

// }


UserSchema.methods.getUsers = function (cond) {
  return new Promise((resolve, reject) => {
    this.model('users').find(cond, (err, res) => {
      if (err)
        reject(err)
      else
        resolve(res)
    });
  })

}


UserSchema.methods.getUserList = function (cond) {
  return new Promise((resolve, reject) => {
    this.model('users').find((err, res) => {
      if (err)
        reject(err)
      else
        resolve(res)
    });
  })
}



UserSchema.methods.insertOrUpdateUser = function (cond, data) {
  return new Promise((resolve, reject) => {
    this.model('users').updateOne(cond, data, { upsert: true }, (err, res) => {
      if (err)
        reject(err)
      else
        resolve(res)
    });
  })

}

UserSchema.methods.insertGroupInUser = function (cond, data) {
  return new Promise((resolve, reject) => {
    this.model('users').updateOne(cond, { $push: { groups: data } }, (err, res) => {
      if (err)
        reject(err)
      else
        resolve(res)
    });
  })

}


UserSchema.methods.insertP2pInUser = function (cond, data) {
  return new Promise((resolve, reject) => {
    this.model('users').updateOne(cond, { $push: { p2ps: data } }, (err, res) => {
      if (err)
        reject(err)
      else
        resolve(res)
    });
  })

}

GroupChatSchema.methods.storeGoupChat = function (cond, data) {
  return new Promise((resolve, reject) => {
    this.model('groupchats').updateOne(cond, { $push: { messages: data } }, { upsert: true },  (err, res) => {
      if (err)
        reject(err)
      else
        resolve(res)
    })
  })
}


GroupChatSchema.methods.findGroupChat = function (cond) {
  return new Promise((resolve, reject) => {
    this.model('groupchats').findOne(cond, (err, res) => {
      if (err)
        reject(err)
      else
        resolve(res)
    })
  })
}



P2PSchema.methods.storeP2PChat = function (cond, data) {
  return new Promise((resolve, reject) => {
    this.model('userchats').updateOne(cond, { $push: { messages: data } }, { upsert: true }, (err, res) => {
      if (err)
        reject(err)
      else
        resolve(res)
    })
  })
}

P2PSchema.methods.findP2PChat = function (cond, data) {
  return new Promise((resolve, reject) => {
    this.model('userchats').findOne(cond, (err, res) => {
      if (err)
        reject(err)
      else
        resolve(res)
    })
  })
}


const GroupModel = GMChatApp.model('groups', GroupSchema);
const UserModel = GMChatApp.model('users', UserSchema);
const GroupChatModel = GMChatApp.model('groupchats', GroupChatSchema);
const UserChatModel = GMChatApp.model('userchats', P2PSchema);


module.exports = {
  GroupModel: new GroupModel(),
  UserModel: new UserModel(),
  GroupChatModel: new GroupChatModel(),
  UserChatModel: new UserChatModel()
}



// Retry connection
const connectWithRetry = () => {
  console.log('MongoDB connection with retry')
  GMChatApp = mongoose.connect(createMongoConn('gmchat'), { useNewUrlParser: true })
}

GMChatApp.on('error', (err) => {

  console.log(`MongoDB connection error: ${err}`)
  setTimeout(connectWithRetry, 5000)

  console.log("error occured", err);
})

GMChatApp.once('open', () => {
  console.log('connected to GMChatApp DB!!');
});
