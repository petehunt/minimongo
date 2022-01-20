/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const chai = require("chai");
const { assert, expect } = chai;
const db_queries = require("./dbQueries");
const puppeteer = require('puppeteer');

describe("MemoryDb - node", function () {
  describe("passes queries", function () {
    return db_queries.call(this);
  });
});

describe('MemoryDB - puppeteer', function () {
  //this.timeout(10000);
  let page;
  before (async function () {
    global.expect = expect;
    global.assert = assert;
    // --no-sandbox and --disable-setuid-sandbox allow this to easily run in docker
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    global.browser = browser
    page = await browser.newPage();

    page.on('error', (err) => {
      console.warn('The page has crashed.', err);
    });


    page.setViewport({ width: 1920, height: 1080 });
    await page.goto('about:blank', { waitUntil: 'domcontentloaded' });
    this.page = page;
    console.debug('puppeteer ready')
  });

  after (async function () {
    await page.close();
    await browser.close();
  });

  beforeEach(async function f () {
    await page.waitForFunction('window.innerWidth > 1365')
  })

  describe("passes queries", function () {
    return db_queries.call(this);
  });
});
