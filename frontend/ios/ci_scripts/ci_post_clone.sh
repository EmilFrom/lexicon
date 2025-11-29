#!/bin/bash
set -e
echo "Running ci_post_clone.sh"

# cd out of ios/ci_scripts into main project directory
cd ../../

# install node and cocoapods
brew install node cocoapods


# yarn
npm install -g corepack
npm install -g expo
corepack enable
corepack prepare yarn@4.1.1 --activate

# install node modules
yarn install

# 3. Install iOS Pods
eas build -p ios --profile production --local
# See note above about patching for GetEnv Issue
#npm i patch-package
#npx patch-package

# xcode cloud sets `CI` env var to 'TRUE':
# This causes a crash: Error: GetEnv.NoBoolean: TRUE is not a boolean.
# This is a workaround for that issue.
CI="true" npx expo prebuild