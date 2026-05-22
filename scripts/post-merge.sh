#!/bin/bash
set -e

# Install any new dependencies pulled in by a merged task.
npm install --no-audit --no-fund
