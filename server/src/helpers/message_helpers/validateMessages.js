module.exports = (message) => {
  filterWords.forEach(element => {
    let stars = '';
    for (let i = 0; i < element.length; i++)
      stars += '*';
    let rgx = new RegExp(element, "gi");
    message = message.replace(rgx, stars);
  });   
  return message;
}

filterWords = [
  'dick',
  'fuck',
  'suck',
  'boobs',
  'shit',
  'bitch',
  'kutey',
  'pussy',
  'cunt',
  'lund',
  'chuut',
  'choot',
  'chotiye',
]

