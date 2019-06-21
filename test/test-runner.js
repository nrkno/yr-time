const fs = require('fs');
const nunjucks = require('nunjucks');
const path = require('path');

const testJs = fs.readFileSync(
  path.join(__dirname, '../docs/index.test.umd.js'),
  'utf8'
);

nunjucks.configure(__dirname, { autoescape: false });

const testRunnerHtml = nunjucks.render('test-runner.njk', { testJs });

fs.writeFileSync(
  path.join(__dirname, '../docs/index.html'),
  testRunnerHtml,
  'utf8'
);
