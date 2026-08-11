// Karma CI: usa Microsoft Edge headless para no requerir Chrome.
const base = require('./karma.conf.js');

module.exports = function (config) {
  base(config);
  config.set({
    browsers: ['EdgeHeadless'],
    singleRun: true,
    autoWatch: false,
    restartOnFileChange: false,
    customLaunchers: {
      EdgeHeadless: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--headless=new',
          '--remote-debugging-port=9222'
        ],
        chromeBin: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
      }
    }
  });
};
