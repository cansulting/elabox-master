const express = require("express");
const https = require("https");
const axiosP = require("axios");
var shell = require('shelljs');

// const fan_control = require("./control_fan")

const axios = axiosP.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
});
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
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey("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");

app.use(logger("dev"));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// create a routes folder and add routes there
const router = express.Router();

const url = "http://elabox.local";
// const url = "http://192.168.0.23";

const companion_directory = "/home/elabox/companion";
let elaPath = "/home/elabox/supernode/ela"
let keyStorePath = elaPath + "/keystore.dat"
let binariesPath = "/home/elabox/elabox-binaries"



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

const runBackend = async () => {
  var dirExists = await checkFile(companion_directory);
  console.log("Companinion Directory Exists", dirExists);
  if (dirExists) {
    var modules_exists = await checkFile(
      companion_directory + "/package-lock.json"
    );

    if (!modules_exists) {
      exec(
        "echo elabox | sudo -S npm install",
        { cwd: companion_directory, maxBuffer: 1024 * 500 },
        (err, stdout, stderr) => {
          if (err) {
            console.error("npm i ", err);
          } else {
            console.log("npm i ", stdout);
            spawnBackend();

          }
        }
      );

    } else {
      spawnBackend();
    }
  }
};

runBackend()

// TODO: Think of a way to handle power loss while master update

// checkFile("package-lock.json").then(exists => {
//   if (exists) {
//     exec("git log -1 --format=%at | xargs -I{} date -d @{} +%Y-%m-%dT%H:%M:%S", (error, stdout, stderr) => {
//       const commitTime = Date.parse(stdout.trim())
//       var stats = fs.statSync("package-lock.json");
//       console.log(stats)
//       const lastModified = stats.atimeMs
//       console.log("Last COmmit", commitTime, " last git pull", lastModified)
//       if (commitTime > lastModified) {
//         npmI()
//       }

//     })

//   } else {
//     npmI()
//   }
// })


const npmI = () => {
  console.log("Installing Modules")
  exec("echo elabox | sudo -S npm install", (error, stdout, stderr) => {
    console.log("Npm Install", stdout)
    process.exit()
  })
}

setInterval(npmI, 1000 * 60 * 60 * 2)





setInterval(async () => {
  const { backend, frontend } = await checkRunning()

  if (!backend) {
    runBackend()
    console.log("Backend off, starting it ")

  }


}, 60 * 1000)


setInterval(async () => {
  console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
  const masterUpdateAvailable = await checkMasterUpdateAvailable()
  console.log("checkMasterUpdateAvailable", masterUpdateAvailable)
  if (masterUpdateAvailable) {
    await updateMasterRepo()
    npmI()
  }
  console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")

}, 1000 * 60 * 60 * 4)






setInterval(async () => {

  console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
  // await fan_control()
  console.log(Date.now())
  const keyExists = await checkFile(keyStorePath)
  console.log(keyExists ? "Yes" : "No")
  const elaRunning = await checkElaRunning()
  console.log("Ela Running", elaRunning)
  if (keyExists && elaRunning) {
    const keyStoreObj = JSON.parse(fs.readFileSync(keyStorePath))
    const wallet = keyStoreObj.Account[0].Address
    const serial = await getSerialKey()
    const payload = { serial, wallet }

    var resp = await axios.post(
      "https://159.100.248.209:8080/",
      payload

    );

    console.log("Response", resp.data);
  }


  console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
}, 1000 * 60 * 10)





const runCarrier = () => {
  console.log("Running Carrier Script")

  var prom = new Promise((resolve, reject) => {
    shell.cd(binariesPath)
    shell.exec(
      "./check_carrier.sh",
      { maxBuffer: 1024 * 500 * 500 },

      (err, stdout, stderr) => {
        if (err) {
          console.log("Failed CP");
          throw (err)

        } else {
          console.log("Success CP");
          resolve(stdout.trim())
        }
      }
    );
  });

  return prom;
}


setInterval(runCarrier, 1000 * 60 * 60 * 8)






const getSerialKey = () => {
  var prom = new Promise((resolve, reject) => {
    exec(
      "cat /proc/cpuinfo | grep Serial | cut -d ' ' -f 2",
      { maxBuffer: 1024 * 500 },

      (err, stdout, stderr) => {
        if (err) {
          console.log("Failed CP");
          throw (err)

        } else {
          console.log("Success CP");
          resolve(stdout.trim())

        }
      }
    );
  });

  return prom;
}


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

router.get("/updateNow", async (req, res) => {
  await replaceWithMaintainencePage()
  updateRepo();
  res.send({ ok: true });
});

const updateRepo = () => {
  const git = spawn("git", ["pull"], {
    cwd: companion_directory,
  });
  git.stdout.on("data", (data) => {
    console.log(`git stdout: ${data}`);
  });

  git.stderr.on("data", (data) => {
    console.error(`git stderr: ${data}`);
  });

  git.on("close", (code) => {
    console.log(`git child process exited with code ${code}`);
    updatePackages();
  });

  git.on("error", (code) => {
    console.log(` gitchild process error with code ${code}`);
  });
};

const updateMasterRepo = () => {
  return new Promise((resolve, reject) => {
    const git = spawn("git", ["pull"]);
    git.stdout.on("data", (data) => {
      console.log(`git stdout: ${data}`);
    });

    git.stderr.on("data", (data) => {
      console.error(`git stderr: ${data}`);
    });

    git.on("close", (code) => {
      console.log(`git child process exited with code ${code}`);
      resolve()
    });

    git.on("error", (code) => {
      console.log(` gitchild process error with code ${code}`);
      resolve()
    });


  })

};


const checkMasterUpdateAvailable = async () => {
  return new Promise(async (resolve, reject) => {
    var resp = await axios.get(
      "https://api.github.com/repos/ademcan/elabox-master/commits/master",
      {
        headers: {
          Authorization: "token e1bc8dbecf3daaaa98340fea547e55e86ba260bd",
        },
      }
    );

    // console.log("Response", resp);
    // console.log("Response", resp.data.sha);
    exec(
      "git rev-parse HEAD",
      { maxBuffer: 1024 * 500 },
      (err, stdout, stderr) => {
        if (err) {
          console.log("error", err);
          reject(err);
        }
        console.log("stderr", stderr);
        console.log("stdout", stdout, resp.data.sha);
        resolve(stdout.trim() !== resp.data.sha);
      }
    );
  });
};


const checkUpdateAvailable = async () => {
  return new Promise(async (resolve, reject) => {
    var resp = await axios.get(
      "https://api.github.com/repos/ademcan/elabox-companion/commits/master",
      {
        headers: {
          Authorization: "token e1bc8dbecf3daaaa98340fea547e55e86ba260bd",
        },
      }
    );

    console.log("Response", resp);
    console.log("Response", resp.data.sha);
    exec(
      "git rev-parse HEAD",
      { cwd: companion_directory, maxBuffer: 1024 * 500 },
      (err, stdout, stderr) => {
        if (err) {
          console.log("error", err);
          reject(err);
        }
        console.log("stderr", stderr);
        console.log("stdout", stdout, resp.data.sha);
        resolve(stdout.trim() !== resp.data.sha);
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



const spawnBackend = async () => {
  console.log("Spawning");
  const install = spawn("nodemon", ["index.js"], {
    cwd: companion_directory + "/src_server",
  });
  install.stdout.on("data", (data) => {
    console.log(`Backend stdout: ${data}`);
  });

  install.stderr.on("data", (data) => {
    console.error(`backend stderr: ${data}`);
  });

  install.on("close", (code) => {
    console.log(`child process exited with code ${code}`);
  });

  install.on("error", (code) => {
    console.log(`child process error with code ${code}`);
  });
  console.log("Spawned");
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
      exec(
        "echo elabox | sudo -S npm install",
        { cwd: companion_directory, maxBuffer: 1024 * 500 },
        (err, stdout, stderr) => {
          if (err) {
            console.error("npm i ", err);
          } else {
            console.log("npm i ", stdout);
            spawnFrontend();

          }
        }
      );

    } else {
      spawnFrontend();
    }
  }
};

const updatePackages = async () => {
  console.log("Installing");
  const install = spawn("npm", ["i"], {
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
    spawnFrontend()
  });

  install.on("error", (code) => {
    console.log(`build child process error with code ${code}`);
  });
  console.log("Installed");
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
            { cwd: companion_directory, maxBuffer: 1024 * 500 },
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

const replaceWithMaintainencePage = () => {
  var prom = new Promise((resolve, reject) => {
    exec(
      "echo elabox | sudo -S cp ./maintainence/index.html /var/www/elabox/build/index.html",
      { maxBuffer: 1024 * 500 },

      (err, stdout, stderr) => {
        if (err) {
          console.log("Failed CP");

        } else {
          console.log("Success CP");

        }
        resolve()
      }
    );
  });

  return prom;






}


const checkElaRunning = () => {

  return new Promise((resolve, reject) => {
    exec('pidof ela', { maxBuffer: 1024 * 500 }, async (err, stdout, stderr) => {
      { stdout == "" ? elaRunning = false : elaRunning = true }
      resolve(elaRunning)
    })
  })
}



// exec('pidof did', { maxBuffer: 1024 * 500 }, async (err, stdout, stderr) => {
//   { stdout == "" ? didRunning = false : didRunning = true }
//   exec('pidof token', { maxBuffer: 1024 * 500 }, async (err, stdout, stderr) => {
//     { stdout == "" ? tokenRunning = false : tokenRunning = true }
//     exec('pidof ela-bootstrapd', { maxBuffer: 1024 * 500 }, async (err, stdout, stderr) => {
//       { stdout == "" ? carrierRunning = false : carrierRunning = true }
//       exec('curl -s ipinfo.io/ip', { maxBuffer: 1024 * 500 }, async (err, stdout, stderr) => {
//         // res.json({ elaRunning, didRunning, tokenRunning, carrierRunning, carrierIp: stdout })
//       });
//     });
//   });
// });

router.post("/sendSupportEmail", async (req, res) => {


  const msg = {
    to: 'purujit.bansal9@gmail.com',
    from: req.body.email.trim(),
    subject: 'Elabox Support Needed ' + req.body.name,
    text: 'Elabox Support is needed to\n Name: ' + req.body.name + "\nEmail: " + req.body.email + "\nProblem: " + req.body.problem,
  };
  sgMail.send(msg, (err, result) => {
    if (err) {
      res.status(500)
    }
    else {
      res.send({ ok: true })
    }

  });



})






// define the router to use
app.use("/", router);

app.listen(port, function () {
  console.log("Runnning on " + port);
});



module.exports = app;
