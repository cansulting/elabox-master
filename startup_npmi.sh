#!/bin/bash
touch /home/elabox/elabox-master/startup_logs.log
echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ STARTING BOOT TIME CRON ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~" >> /home/elabox/elabox-master/startup_logs.log
cd /home/elabox/elabox-master/
echo "Current Directory: `pwd`, Installing Modules for Master" >> /home/elabox/elabox-master/startup_logs.log
echo "Starting Time : `date`" >> /home/elabox/elabox-master/startup_logs.log
echo "elabox" | sudo -S npm install >> /home/elabox/elabox-master/startup_logs.log
echo "elabox" | sudo -S npm rebuild
echo "Ending Time: `date`" >> /home/elabox/elabox-master/startup_logs.log
cd /home/elabox/companion/
echo "Current Directory: `pwd`, Installing Modules for Companion" >> /home/elabox/elabox-master/startup_logs.log
echo "Starting Time: `date`" >> /home/elabox/elabox-master/startup_logs.log
echo "elabox" | sudo -S npm install >> /home/elabox/elabox-master/startup_logs.log
echo "elabox" | sudo -S npm rebuild
echo "Ending Time: `date`" >> /home/elabox/elabox-master/startup_logs.log
cd /home/elabox/elabox-binaries/
echo "Current Directory: `pwd`, Installing Modules for Binaries Repo" >> /home/elabox/elabox-master/startup_logs.log
echo "Starting Time: `date`" >> /home/elabox/elabox-master/startup_logs.log
echo "elabox" | sudo -S npm install >> /home/elabox/elabox-master/startup_logs.log
echo "elabox" | sudo -S npm rebuild
echo "Ending Time: `date`" >> /home/elabox/elabox-master/startup_logs.log
echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ ENDING BOOT TIME CRON ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~" >> /home/elabox/elabox-master/startup_logs.log



