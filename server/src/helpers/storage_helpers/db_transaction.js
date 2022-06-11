const { GroupModel, UserModel, GroupChatModel, UserChatModel } = require('../../managers/queryManager');

module.exports = {

  /***
  * create/update group with the list of members
  * e.g. data: { groupName, members:[username, username, ...] }
  */
  createGroup: function (data) {
    return new Promise((resolve, reject) => {


    })

  },


  storeP2PUser: function (data) {
    return Promise.all([
      UserModel.insertP2pInUser({ username: data.members[0].username }, {username: data.members[1].username, name: data.members[1].name}),
      UserModel.insertP2pInUser({ username: data.members[1].username }, {username: data.members[0].username, name: data.members[0].name})
    ])
  },



  /***
    * create user
    * e.g. data: { username, name, socket, groups:[](optional) }
    */
  createUser: function (data) {
    return UserModel.createUser(data);
  },


  getAUser: function (cond) {
    return UserModel.getAUser(cond);
  },


  getUsers: function (cond) {
    return UserModel.getUsers(cond);
  },

  /***
  * insert user to group with the list of members
  * e.g. data: { groupName, members:[username, username, ...] }
  */
  addNewMemberToGroup: function (cond, data) {
    return Promise.all([
      GroupModel.insertOrUpdateGroup({ groupid: cond }, { $push: { members: { $each: data } } }),
      ...data.map(obj => UserModel.insertGroupInUser({ username: obj.username }, cond))
    ])
  },


  addBlockedUser: function (cond, data) {
    return UserModel.insertOrUpdateUser({ username: cond }, { $push: { blocklist: data } })
  },


  /***
    * find a group by it's unique groupid
    * e.g. data: { groupid}
    */
  getGroup: function (cond) {
    return GroupModel.getAGroup(cond);
  },


  findP2PChat: function (cond) {
    return UserChatModel.findP2PChat({ groupid: cond })
  },


  /***
    * find a group by it's unique groupid
    * e.g. data: { groupid}
    */
  getUser: function (cond) {
    return UserModel.getAUser({ username: cond.username });
  },



  /***
  * find a group by it's unique groupid
  * e.g. data: { groupid}
  */
  getUserList: function (cond) {
    return UserModel.getUserList();
  },



  /***
   * push the chat conversation in mongo collection
   * if chatting for the first time then automatically 
   * creates new collection
   */
  storeP2PChat: function (cond, data) {
    return UserChatModel.storeP2PChat({ groupid: cond }, data)
  },



  /***
   * push the chat conversation in mongo collection
   * if chatting for the first time then automatically 
   * creates new collection
   */
  storeGroupChat: function (cond, data) {
    return GroupChatModel.storeGoupChat({ groupid: cond }, data)
  },

  findGroupChat: function (groupid) {
    return GroupChatModel.findGroupChat({ groupid })
  },


  /***
   * push the chat conversation in mongo collection
   * creates new document for every day
   */
  storeOpenGroupChat: function (params) {

  },

  insertUserInBlockList: function (username) {
    
  }




}

