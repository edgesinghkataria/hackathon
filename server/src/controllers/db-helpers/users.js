const UserModel = require('../../schemas/users');
const UserChatModel = require('../../schemas/userchats');

const createUser = (username, name) => new Promise((resolve, reject) => {
  UserModel.create({
    username,
    name
  })
  .then(res => resolve(res))
})


const getUser = (_id) => new Promise((resolve, reject) => {
  UserModel.findById(_id , (err, res) => {
    if (err)
      reject(err)
    else
      resolve(res)      
  });
})


const getUserByUsername = (username) => new Promise((resolve, reject) => {
  UserModel.findOne({ username }, (err, res) => {
    if (err)
    reject(err)
  else
    resolve(res) 
  })
})


const getUserById = (id, options) => new Promise((resolve, reject) => {
  UserModel.findById(id, options, (err, res) => {
    if (err)
      reject(err)
    else
      resolve(res)      
  });
})

const findP2pInUser = (id, p2pId) => new Promise((resolve, reject) => {

  UserModel
  .findOne({ _id: id, p2ps: { $elemMatch: { member: p2pId} } }, { p2ps: { $elemMatch: { member: p2pId } } })
  .populate('p2ps._id')
  .exec((err, res) => {
    if (err)
      reject(err)
    else
      resolve(res)
  });
})




const getUsers = (usernames) => new Promise((resolve, reject) => {
  UserModel.find({ _id : { $in: usernames } }, (err, res) => {
    if (err)
      reject(err)
    else
      resolve(res)      
  });
})


const getAUserWithPopulate = (_id, path, select) => new Promise((resolve, reject) => {
  UserModel.findOne({ _id })
  .populate({
    path,
    select
  })
  .exec((err, res) => {
    if (err)
      reject(err)
    else
      resolve(res)
  });
})


const insertGroupInUser = (_id, groupid) => new Promise((resolve, reject) => {

  UserModel.updateOne({ _id }, { $push: { groups: groupid } }, (err, res) => {
    if (err)
      reject(err)
    else
      resolve(res)
  });
})


const insertP2pInUser = (cond, data) => new Promise((resolve, reject) => {
  UserModel.updateOne(cond, { $push: { p2ps: data } }, (err, res) => {
    if (err)
      reject(err)
    else
      resolve(res)
  });
})


const updateBlockListOfUser = (cond, data) => new Promise((resolve, reject) => {
  UserModel.updateOne(cond, { $push: { blocklist: data } }, (err, res) => {
    if (err)
      reject(err)
    else
      resolve(res)
  });
})

const getUserChats = (id) => new Promise((resolve, reject) => {
  UserModel
  .findById(id)
  .populate('groups')
  .populate({
    path: 'p2ps.member',
    select: 'username name _id role'
  })
  .exec((err, res) => {
    if (err)
      reject(err)
    else
      resolve(res) 
  });

})


const findP2PChat = function (groupid) {
  return new Promise((resolve, reject) => {
    UserChatModel.findById(groupid, (err, res) => {
      if (err)
        reject(err)
      else
        resolve(res)
    })
  })
}


const createP2PChat = function (requestor, user, id ) {

  return new Promise((resolve, reject) => {
    UserChatModel.create({ _id: id, members: [requestor, user] }, (err, res) => {
      if (err)
        reject(err)
      else{
        Promise.all([
          UserModel.findOneAndUpdate({ _id: requestor },  { $addToSet: { p2ps : { member: user, _id: id } } }),
          UserModel.findOneAndUpdate({ _id: user }, { $addToSet: { p2ps :  { member: requestor, _id: id } } } )
        ])
        .then(() => resolve(res))
      }
    })
  })
}

const blockUser = (requester, userToBlock, reason) => new Promise((resolve, reject) => {
  let groupid = [requester,userToBlock].sort().join('')
  UserChatModel.findOne({groupid})
  .then(raw => {
    if(raw){
      UserChatModel.updateOne({groupid}, {isBlocked: true, blockers: [{ userid: requester, reason: reason || 'not provided' }]})
      .then(() => {
        resolve()
      })
    }
    else{
      UserChatModel.create({
        groupid,
        isBlocked: true,
        blockers: [{ userid: requester, reason: reason || 'not provided' }]
      }).then(() => {
        resolve()
      })
    }
  })
  .catch(() => reject())
})


const userChatHistory = (to, from, channel) => new Promise((resolve, reject) => {


        /**
         * find p2p channel info in cache
         */
        // console.log('1. finding in cache');

        // cache.getValueOfKey(channel)
        //   .then(cache_raw => {
        //     cache_raw = prs(cache_raw);

        //     /**
        //      * if response is empty
        //      */
        //     if (!cache_raw) {
        //       console.log('2. not found in cache');
        //       console.log('3. finding in db');

              /**
               * find channel info in DB
               */
              findP2PChat(channel)
                .then(db_raw => {

                  /**
                   * if response is empty
                   */
                  if (!db_raw) {
                      resolve({status: false, desc: 'yo seem to be lost'});
                    // console.log('4. not found in db too');

                    // console.log('5. storing p2p chat');
                    // createP2PChat(`${[to, from].sort().join('')}`, '')
                    //   .then(() => {
                    //     console.log('6. storing p2p against users');
                    //     /**
                    //      * updating users collections with the p2p id
                    //      */
                    //     storeP2PUser({ members: [{ username: arr[0].username, name: arr[0].name }, { username: arr[1].username, name: arr[1].name }] })
                    //       .then(() => {
                    //         console.log('7. setting cache of users');

                    //         getUser({ $in: [to, from] })
                    //           .then((arr) => {

                    //             /**
                    //              * iterating through db results
                    //              */
                    //             let temparr = arr.map((ele, i) =>

                    //               cache.getValueOfKey(ele.username)
                    //                 .then(cache_raw => {


                    //                   cache_raw = prs(cache_raw);

                    //                   if (!cache_raw)
                    //                     return
                    //                   // console.log(cache_raw, ' data before adding congusing data in cache ');
                    //                   // console.log({username: arr[0].username, name: arr[0].name}, {username: arr[1].username, name: arr[1].name});

                    //                   if (i)
                    //                     cache_raw.data.p2ps.push({ username: arr[0].username, name: arr[0].name })
                    //                   else
                    //                     cache_raw.data.p2ps.push({ username: arr[1].username, name: arr[1].name })

                    //                   console.log(sfy(cache_raw), ' after all the bc');

                    //                   temparr.push(cache.setValueOfKey(ele.username, sfy(cache_raw)));
                    //                 })
                    //                 .catch(err => console.log(err, ' error in line 144'))
                    //             )

                    //             Promise.all(temparr)
                    //               .then(() => {
                    //                 performSocketActions({ arr, channel }, 'SETUP_P2P_ROOM')
                    //                   .then(() => {
                    //                     res.status(200).contentType('json').send({ status: true, data: [], from: ' new user p2p initiated!!!' })
                    //                   })
                    //                   .catch(err => console.log(err, ' error in line 153'))
                    //               })
                    //               .catch(err => console.log(err, ' line 149'))
                    //           })
                    //           .catch(err => console.log('MERROR: server:133, while saving members data in cache ', err))

                    //           .then(() => {

                    //           });
                    //       })

                    //   })
                  }

                  /**
                   * if response recieved from mongodb
                   */
                  else {
                    
                    if(db_raw.isBlocked)
                      return resolve({ status: true, desc:'inbox is blocked ', blocker: db_raw.blockers })

                    resolve({ status: true, data: db_raw.messages });
                    // getUsers({ username: { $in: [to, from] } })
                      // .then((arr) => {
                        // performSocketActions({ arr, channel }, 'SETUP_P2P_ROOM')
                      // })

                    // res.status(200).contentType('json').send()
                  }

                })
                .catch(err => console.log(err))
            // }
            // else
          //     /**
          //      * if response recieved from cache
          //      */
          //     res.status(200).contentType('json').send({ status: true, data: cache_raw, from: 'cache' })

          // })
          // .catch(err => console.log(err))

      })

const storeP2PChat = ({ text, from, time, channelId }) => new Promise((resolve, reject) => {

  UserChatModel
  .findByIdAndUpdate(channelId, { $push: { messages: { from, text, time } } })
  .exec((err, res) => {
    if(err)
      reject(err)
    else
      resolve(res)
  })
})

module.exports = {
  storeP2PChat, 
  findP2pInUser,
  getUserById,
  createUser,
  getUser,
  getUsers,
  getAUserWithPopulate,
  insertGroupInUser,
  insertP2pInUser,
  updateBlockListOfUser,
  getUserChats,
  blockUser,
  findP2PChat,
  createP2PChat,
  userChatHistory,
  getUserByUsername,
}
