const crypto = require('crypto');

const answers = [
  "data extortion",
  "tata electronics",
  "world leaks",
  "india",
  "tamil nadu",
  "hosur",
  "630 gb",
  "200,000",
  "apple and tesla",
  "financial extortion",
  "no",
  "cert-in",
  "mandiant",
  "confidential corporate documents"
];

const hashes = answers.map(ans => crypto.createHash('sha256').update(ans).digest('hex'));
console.log(JSON.stringify(hashes, null, 2));
