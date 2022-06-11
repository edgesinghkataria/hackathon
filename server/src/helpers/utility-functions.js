'use strict'
const mongoose = require('mongoose');
const { MAX_BUCKET_SIZE } = require('../config/index');

/**
 * validates mongodb ObjectId
 * @param {String} objectId mongodb id
 * @returns {Boolean} true/false
 */
const isObjectIdValid = (objectId) => {
  try {
    let castedId = new mongoose.Types.ObjectId(objectId);
    if (typeof objectId !== 'string' || String.prototype.localeCompare.call(castedId, objectId))
      return false;
    return mongoose.Types.ObjectId.isValid(objectId)
  } catch (e) {
    return false;
  }
}

/**
 * validates the parameters with the types provided as a last argument
 * @param {Number/String/Array} Datatypes validate number/string/array against the last argument passed
 * @returns {Boolean} true/false 
 * if parameters passed are different types then pass array of types as a last argument, maintaining the sequence
 */
function areParametersValid() {
  let lastIndex = arguments.length - 1,
  validateAgainst = arguments[lastIndex];

  if (Array.isArray(validateAgainst)) {

    for (let i = 0; i < validateAgainst.length; i++) {
      const ele = validateAgainst[i];
      
      if('Array' === ele.name){
        if(!Array.isArray(arguments[i]) || !arguments[i].length)
          return false;
      }
      else if (arguments[i] !== 0 && (!arguments[i] || ele === 'undefined' || ele === 'null' || (new String(ele.name).toLowerCase() !== typeof arguments[i])))
        return false;
    }
    return true;

  }
  else if ('String' === validateAgainst.name) {

    for (let i = 0; i < lastIndex; i++) {
      const ele = arguments[i];
      if (!ele || ele === 'undefined' || ele === 'null' || 'string' !== typeof ele)
        return false;
    }
    return true

  }
  else if ('Number' === validateAgainst.name) {

    for (let i = 0; i < lastIndex; i++) {
      const ele = arguments[i];
      if (ele !== 0 && (!ele || ele === 'undefined' || ele === 'null' || 'number' !== typeof ele))
        return false;
    }
    return true
  }
  else
    throw new Error('Only accept types Array, Number or String')
}

/**
 * matches one string with another
 * @param {String} str1
 * @param {String} str2 
 * @returns {Boolean} true/false
 */
const isStringEqual = (str1, str2) => {
  return !''.localeCompare.call(str1, str2);
}

/**
 * limit the array by applying limit and offset(from the end of array)
 * @param {Array} arr target array to make operation on
 * @param {Number} limit limit of numbers to return resp of offset
 * @param {Number} offset number of array elemnets to skip from last of the array
 */
const limitifyAndOffsetify = (arr, limit, offset, reverse) => {
  if (limit < 0 || offset < 0)
    return [];

  let temp = [];

  if (reverse) {
    for (let i = offset;  i < arr.length; i++)
      temp[i - offset] = arr[i];
  }
  else {

    let startFrom = arr.length - offset - 1;
    let endAt = (arr.length - (limit + offset)) < 0 ? 0 : (arr.length - (limit + offset));

    for (let i = startFrom; (i >= 0 && i >= endAt); i--)
      temp[i - endAt] = arr[i];
  }

  return temp;
}



const validateMembersArray = (members) => {
  let valid = true;
  members.forEach(ele => {

    if (
      !(
        'isAdmin' in ele &&
        'userID' in ele &&
        ele.userID &&
        'boolean' === typeof ele.isAdmin &&
        'string' === typeof ele.userID &&
        isObjectIdValid(ele.userID)
      )
    )
      valid = false;
  })

  return valid;
}

const getMembersInDBFormat = (members) => {
  return members.map(ele => ({ _id: ele.userID, isAdmin: ele.isAdmin }));
}


/**
 * getting the actual offset and bucket number to fetch data from db
 * 
 * @param {Number} cBucket 
 * @param {Number} cCount 
 * @param {Number} offset 
 * @param {Number} limit 
 * @returns {Array} Array containing the numbers of buckets & bucket numbers to fetch with 
 */
const getEstimateBucket = (cBucket, cCount, offset, limit) => {

  if (cBucket <= 1)
    return { 
      offset: offset>MAX_BUCKET_SIZE ? MAX_BUCKET_SIZE : offset, 
      bucket: [1] 
    };

  if (offset < cCount) {

    let availableMsgs = cCount - offset;

    if (limit > availableMsgs)
      return { offset, bucket: [cBucket, cBucket - 1] };
    else
      return { offset, bucket: [cBucket] }

  }
  else
    offset -= cCount;

  return getEstimateBucket(cBucket - 1, MAX_BUCKET_SIZE, offset, limit);
}


const unifyString = (str) => {
  let indexes = '#',
  output = '';

  for (let i = 0; i < str.length; i++) {
    let char = str.charAt(i),
    ascii_char = char.charCodeAt();

    if(ascii_char > 64 && ascii_char < 91){
      char = String.fromCharCode(ascii_char + 32);
      indexes += i;
    }

    output += char;    
  }

  return (indexes.length > 1) ? output.concat(indexes) : output;
}




module.exports = {
  isStringEqual,
  isObjectIdValid,
  getEstimateBucket,
  areParametersValid,
  limitifyAndOffsetify,
  validateMembersArray,
  getMembersInDBFormat,
  unifyString,
}