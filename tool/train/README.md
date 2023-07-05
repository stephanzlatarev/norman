To train a brain based on playbooks:

1. Add all play books (with file extension ".book") into this folder
1. Add mirror.js with all applicable mirrors
1. Build and deploy the trainer with `./deploy.bat`

To download the brain:

1. Choose one trainer by comparing their status with `./ping.bat`
1. Update `kubernetes-http.yaml` with the selector label of the chosen trainer and apply it to start a LoadBalancer
1. Download the brain with `http://<hostname-of-loadbalancer>/brain.tf`
