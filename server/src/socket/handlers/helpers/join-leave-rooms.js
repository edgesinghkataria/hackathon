'use strict'
const join_leave_rooms = (socket, res, join_leave) => {
  res.forEach(ele => {
     if(ele.mID)
      return;
    socket[join_leave](ele._id)
  })
}


const join_leave_groups = (socket, res, join_leave) =>  {
  socket && res.forEach(ele => {
    socket[join_leave](ele._id)
  })
  return 1;
}


const join_leave_p2ps = (socket, res, join_leave) => {
  res.forEach(ele => {
    socket[join_leave](ele._id)
  })
}

module.exports = {
  join_leave_rooms,
  join_leave_p2ps,
  join_leave_groups
}