# ElephantTO Events - Ansible Deployment

This directory contains deployment scripts for ElephantTO Events on Oracle Linux 9 ARM.

## ⚠️ Current Status

If your SSH connection is frozen, it likely means an Ansible deployment is still running in the background performing system updates. **Do not run another deployment until you can confirm the current one has finished.**

## 🔍 Check Current Status

```bash
# When SSH becomes available again, check status:
ansible-playbook check-status.yml
```

## 📋 Deployment Options

### Option 1: Manual Deployment (Recommended if Ansible is stuck)

1. **Copy the manual script to the server:**
   ```bash
   scp -i ~/Downloads/ssh-key-2025-08-02.key manual-deploy.sh opc@elephantoevents.ca:~/
   ```

2. **Run the manual deployment on the server:**
   ```bash
   ssh -i ~/Downloads/ssh-key-2025-08-02.key opc@elephantoevents.ca
   chmod +x manual-deploy.sh
   ./manual-deploy.sh
   ```

3. **Copy your application files:**
   ```bash
   # From your local machine:
   ./quick-copy.sh
   ```

### Option 2: Ansible Deployment (Safe Mode)

Only run this if no other deployment is currently running:

```bash
# Check server status first
ansible-playbook check-status.yml

# If server is ready, run safe deployment
ansible-playbook deploy-safe.yml
```

### Option 3: Step-by-step Ansible (Most Control)

Run specific parts of the deployment:

```bash
# Install packages only
ansible-playbook deploy-safe.yml --tags packages

# Install Docker only  
ansible-playbook deploy-safe.yml --tags docker

# Setup application only
ansible-playbook deploy-safe.yml --tags app

# Configure nginx only
ansible-playbook deploy-safe.yml --tags nginx

# Setup SSL only
ansible-playbook deploy-safe.yml --tags ssl
```

## 🚨 Troubleshooting

### If SSH is frozen:
1. **Wait** - System updates can take 10-30 minutes on ARM
2. **Don't run multiple deployments** - This will cause conflicts
3. **Check from another terminal** if you can connect

### If deployment fails:
1. Check logs: `ansible-playbook check-status.yml`
2. SSH into server manually and check: `sudo systemctl status docker nginx`
3. Use manual deployment script as fallback

### If firewall blocks you:
The scripts always ensure SSH stays enabled, but if you get locked out:
- Contact your cloud provider to reset firewall rules
- Use cloud console/VNC access if available

## 📁 Files

- `deploy-safe.yml` - Main Ansible deployment (safe mode)
- `manual-deploy.sh` - Manual deployment script for server
- `quick-copy.sh` - Copy files from local to server  
- `check-status.yml` - Check deployment status
- `hosts` - Server configuration (gitignored)
- `hosts.example` - Example server configuration

## 🎯 Expected Result

After successful deployment:
- **Website**: http://elephantoevents.ca
- **With SSL**: https://elephantoevents.ca  
- **Mailpit**: http://elephantoevents.ca/mailpit/
- **Health check**: http://elephantoevents.ca/api/health

## 🔧 Management Commands

```bash
# Check application status
ssh -i ~/Downloads/ssh-key-2025-08-02.key opc@elephantoevents.ca
sudo systemctl status elephanto-events

# View application logs  
cd /opt/elephanto-events
docker-compose logs -f

# Restart application
sudo systemctl restart elephanto-events

# Manual container restart
cd /opt/elephanto-events  
docker-compose down
docker-compose up -d
```