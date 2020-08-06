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

const url = "http://elabox.local";
// const url = "http://192.168.0.23";

const companion_directory = "/home/elabox/elabox-companion";

router.get("/", (req, res) => {
  checkRunning().then((stats) => {
    console.log("Budbak");
    res.send(stats);
  });
});

router.get("/startBackend", (req, res) => {
  runBackend();
  res.send({ ok: true });
});

router.get("/startFrontend", (req, res) => {
  runFrontend();
  res.send({ ok: true });
});

router.get("/checkUpdate", async (req, res) => {
  try {
    res.send({ available: await checkUpdateAvailable() });
  } catch (error) {
    console.error(error);
    res.send(error, 400);
  }
});

const checkUpdateAvailable = async () => {
  var resp = await axios.get(
    "https://api.github.com/repos/ademcan/elabox-companion/commits/master",
    {
      headers: {
        Authorization: "token e1bc8dbecf3daaaa98340fea547e55e86ba260bd",
      },
    }
  );
  return new Promise((resolve, reject) => {
    exec(
      "git rev-parse HEAD",
      { cwd: companion_directory, maxBuffer: 1024 * 500 },
      (err, stdout, stderr) => {
        if (err) {
          console.log("error", err);
          reject(err);
        }
        console.log("stderr", stderr);
        console.log("stdout", stdout);
        resolve(stdout.trim() === resp.sha);
      }
    );
  });
};

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

const runBackend = async () => {
  var dirExists = await checkFile(companion_directory);
  console.log("Companinion Directory Exists", dirExists);
  if (dirExists) {
    var modules_exists = await checkFile(
      companion_directory + "/package-lock.json"
    );

    if (!modules_exists) {
      const install = spawn("sh", ["-c", "sudo -K << elabox npm install"], {
        cwd: companion_directory,
      });
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

const spawnBackend = async () => {
  console.log("Spawning");
  const install = spawn("nodemon", ["index.js"], {
    cwd: companion_directory + "/src_server",
  });
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
  console.log("Spawned");
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

const runFrontend = async () => {
  var dirExists = await checkFile(companion_directory);
  console.log("Companinion Directory Exists", dirExists);
  if (dirExists) {
    var modules_exists = await checkFile(
      companion_directory + "/package-lock.json"
    );
    console.log(modules_exists);
    if (!modules_exists) {
      console.log("npm running");
      const install = spawn("sh", ["-c", "sudo -K << elabox npm install"], {
        cwd: companion_directory,
      });
      install.stdout.on("data", (data) => {
        console.log(`stdout: ${data}`);
      });

      install.stderr.on("data", (data) => {
        console.error(`stderr: ${data}`);
      });

      install.on("close", (code) => {
        console.log(`child process exited with code ${code}`);
        spawnFrontend();
      });

      install.on("error", (code) => {
        console.log(`child process error with code ${code}`);
      });
    } else {
      spawnFrontend();
    }
  }
};

const spawnFrontend = async () => {
  console.log("Spawning");
  const install = spawn("npm", ["run", "build"], {
    cwd: companion_directory,
  });
  install.stdout.on("data", (data) => {
    console.log(`stdout build: ${data}`);
  });

  install.stderr.on("data", (data) => {
    console.error(`stderr build: ${data}`);
  });

  install.on("close", (code) => {
    console.log(`build child process exited with code ${code}`);
    exec(
      "echo elabox | sudo -S rm -rf /var/www/elabox/build/",
      (err, stdout, stderr) => {
        if (err) {
          console.error("rm", err);
        } else {
          console.log("rm", stdout);
          exec(
            "echo elabox | sudo -S cp -r build/ /var/www/elabox/build/",
            (err, stdout, stderr) => {
              if (err) {
                console.error("cp", err);
              } else {
                console.log("cp", stdout);
                exec(
                  "echo elabox | sudo -S systemctl restart nginx",
                  (err, stdout, stderr) => {
                    if (err) {
                      console.error("systemctl", err);
                    } else {
                      console.log("systemctl", stdout, "success");
                    }
                  }
                );
              }
            }
          );
        }
      }
    );
  });

  install.on("error", (code) => {
    console.log(`build child process error with code ${code}`);
  });
  console.log("Spawned");
};

// define the router to use
app.use("/", router);

app.listen(port, function () {
  console.log("Runnning on " + port);
});

module.exports = app;
