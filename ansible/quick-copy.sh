#!/bin/bash

# Quick script to copy application files to server
# Run this from your local machine

set -e

LOCAL_DIR="../"
REMOTE_USER="opc"
REMOTE_HOST="elephantoevents.ca"
SSH_KEY="~/Downloads/ssh-key-2025-08-02.key"
REMOTE_DIR="/opt/elephanto-events"

echo "📦 Copying ElephantTO Events to server..."

# Copy files using rsync
rsync -av --delete \
  --exclude='ansible/' \
  --exclude='node_modules/' \
  --exclude='.git/' \
  --exclude='.env' \
  --exclude='.DS_Store' \
  -e "ssh -i $SSH_KEY" \
  $LOCAL_DIR \
  $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/

echo "✅ Files copied successfully!"
echo ""
echo "📋 Next steps on server:"
echo "ssh -i $SSH_KEY $REMOTE_USER@$REMOTE_HOST"
echo "cd $REMOTE_DIR"
echo "/usr/local/bin/docker-compose build --no-cache"
echo "/usr/local/bin/docker-compose up -d"