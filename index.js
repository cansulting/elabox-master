const express = require("express");
const axios = require("axios");
const app = express();
// to allow cross-origin request
const cors = require("cors");
const bodyParser = require("body-parser");
const logger = require("morgan");
// define port number
const port = process.env.PORT || 3002;
const { exec } = require("child_process");
const puppeteer = require("puppeteer-core");

app.use(logger("dev"));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// create a routes folder and add routes there
const router = express.Router();

// const  url="http://elabox.local"
const url = "http://192.168.0.23";

router.get("/", (req, res) => {
  checkRunning().then((stats) => {
    console.log("Budbak");
    res.send(stats);
  });
});

const checkRunning = async () => {
  var backend, frontend;

  backend = await axios.get(url + ":3001");
  if (backend.status >= 200 && backend.status < 300) {
    backend = true;
  } else {
    backend = false;
  }

  try {
    frontend = await checkIfFrontendRunning();
  } catch (error) {
    console.log(error);
    frontend = false;
  }

  return { backend, frontend };
};

const checkIfFrontendRunning = async () => {
  const browser = await puppeteer.launch({executablePath:'/usr/bin/chromium-browser'});
  const page = await browser.newPage();
  await page.goto(url+"/check", { waitUntil: "networkidle2" });
  console.log(await page.waitFor(5000));

  var text = await page.evaluate(() => {
    var pre = document.querySelector("pre");
    return pre.innerText;
  });

  var response = JSON.parse(text);
  console.log("bubu");

  await page.screenshot({ path: "example.png" });

  await browser.close();
  return response.ok;
};

// define the router to use
app.use("/", router);

app.listen(port, function () {
  console.log("Runnning on " + port);
});

module.exports = app;
