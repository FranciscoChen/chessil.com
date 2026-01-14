const config = require('../config.json');

const credentials = config.shared.postgresUrl;

module.exports = { credentials };
