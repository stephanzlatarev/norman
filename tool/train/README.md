To train a brain based on playbooks:

1. Add all play books (with file extension ".book") into this folder
1. Add mirror.js with all applicable mirrors
1. Build and deploy docker image with `./deploy.bat`

To download the brain:

1. Choose trainer by comparing their status with `k norman log trainer-1 trainer`
1. Update the LoadBalancer service of `kubernetes.yaml` with the selector label of the chosen trainer
1. Download the brain with `http://<hostname-of-loadbalancer>/brain.tf`
