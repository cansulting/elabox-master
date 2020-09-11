Elabox Master Sccript
runs on port 3002

### cd /home/elabox
### git clone ...
### cd /home/elabox/elabox-master
### npm install
Installing Puppeteer 
### sudo apt-get install chromium-browser
Installing pm2 process manager
### npm install -g pm2
starting master script
### pm2 start index.js --name ebmaster --watch . --time --log /home/elabox/ebmaster.log
tho above command ^^ should be issued only from the directory /home/elabox/elabox-master
### pm2 startup
### pm2 save



# Nginx Conf 
 nginx conf to written in file /etc/nginx/sites-available/default
 default file shared in repo

react build folder to be placed at /var/www/elabox/


# New Steps ADDED on 11/09/2020
### @reboot sleep 60 && sh /home/elabox/elabox-master/startup_npmi.sh
 Add ^^ this line to the and of config at -> `crontab -e`
