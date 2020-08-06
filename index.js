const express = require("express");
const axios = require("axios");
const app = express();
// to allow cross-origin request
const cors = require("cors");
const bodyParser = require("body-parser");
const logger = require("morgan");
// define port number
const port = process.env.PORT || 3002;
const { exec, spawn } = require("child_process");
const puppeteer = require("puppeteer-core");
const fs = require("fs");

app.use(logger("dev"));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// create a routes folder and add routes there
const router = express.Router();

const  url="http://elabox.local"
// const url = "http://192.168.0.23";

router.get("/", (req, res) => {
  checkRunning().then((stats) => {
    console.log("Budbak");
    res.send(stats);
  });
});

router.get("/startBackend", (req, res) => {
    runBackend();
    res.send({ok:true})
  });

const checkRunning = async () => {
  var backend, frontend;
  try {
    backend = await axios.get(url + ":3001");
    if (backend.status >= 200 && backend.status < 300) {
      backend = true;
    } else {
      backend = false;
    }
  } catch (error) {
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
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium-browser",
  });
  const page = await browser.newPage();
  await page.goto(url + "/check", { waitUntil: "networkidle2" });
  console.log(await page.waitFor(5000));

  var text = await page.evaluate(() => {
    var pre = document.querySelector("pre");
    return pre.innerText;
  });

  var response = JSON.parse(text);
  console.log("bubu");

  await browser.close();
  return response.ok;
};

const companion_directory = "/home/elabox/elabox-companion";

const runBackend = async () => {
  var dirExists = await checkFile(companion_directory);
  console.log("Companinion Directory Exists", dirExists);
  if (dirExists) {
    var modules_exists = await checkFile(companion_directory + "/yarn.lock");

    if (!modules_exists) {
      const install = spawn("yarn", ["install"], { cwd: companion_directory });
      install.stdout.on("data", (data) => {
        console.log(`stdout: ${data}`);
      });

      install.stderr.on("data", (data) => {
        console.error(`stderr: ${data}`);
      });

      install.on("close", (code) => {
        console.log(`child process exited with code ${code}`);
        spawnBackend();
      });

      install.on("error", (code) => {
        console.log(`child process error with code ${code}`);
      });
    } else {
      spawnBackend();
    }
  }
};

const spawnBackend = async() => {
    console.log("Spawning")
  const install = spawn(
    "nodemon",
    [
      "index.js",
    ],
    { cwd: companion_directory+"/src_server" }
  );
  install.stdout.on("data", (data) => {
    console.log(`stdout: ${data}`);
  });

  install.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
  });

  install.on("close", (code) => {
    console.log(`child process exited with code ${code}`);
  });

  install.on("error", (code) => {
    console.log(`child process error with code ${code}`);
  });
  console.log("Spawned")

};
const checkFile = (file) => {
  var prom = new Promise((resolve, reject) => {
    try {
      fs.access(file, fs.constants.R_OK, (err) => {
        console.log(`${file} ${err ? "is not readable" : "is readable"}`);
        return err ? resolve(false) : resolve(true);
      });
    } catch (err) {
      if (err) {
        resolve(false);
      }
    }
  });

  return prom;
};

// define the router to use
app.use("/", router);

app.listen(port, function () {
  console.log("Runnning on " + port);
});

module.exports = app;
