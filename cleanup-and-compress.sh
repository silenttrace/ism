#!/bin/bash

# ISM Project Cleanup and Compression Script

echo "Cleaning up ISM project for transfer..."

# Remove large directories that can be regenerated
rm -rf node_modules/
rm -rf frontend/node_modules/
rm -rf backend/dist/
rm -rf frontend/dist/

# Remove runtime files
rm -rf logs/
rm -rf .pids/

# Remove log files
rm -f backend/combined.log
rm -f backend/error.log

echo "Cleanup complete. Creating compressed archive..."

# Create tar.gz archive (excluding additional unnecessary files)
tar -czf ism-nist-mapper.tar.gz \
  --exclude='.DS_Store' \
  --exclude='*.log' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.pids' \
  --exclude='logs' \
  .

echo "Archive created: ism-nist-mapper.tar.gz"
echo "Size: $(du -h ism-nist-mapper.tar.gz | cut -f1)"

# Show what's included
echo -e "\nArchive contents:"
tar -tzf ism-nist-mapper.tar.gz | head -20
echo "... (and more)"