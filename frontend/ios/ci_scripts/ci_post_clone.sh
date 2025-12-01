#!/bin/bash
set -e
echo "Running ci_post_clone.sh"

# cd out of ios/ci_scripts into main project directory
cd ../../

# install node and cocoapods
brew install cocoapods
brew install node@20
brew link --overwrite node@20


# yarn
npm install -g corepack
corepack enable
corepack prepare yarn@4.1.1 --activate

# install node modules
yarn install

yarn add expo

# 3. Install iOS Pods
#npx build -p ios --profile production --local

# See note above about patching for GetEnv Issue


# xcode cloud sets `CI` env var to 'TRUE':
# This causes a crash: Error: GetEnv.NoBoolean: TRUE is not a boolean.
# This is a workaround for that issue.
CI="true" npx expo prebuild --platform ios --clean


# 5. THE FIX: Explicitly install Pods
cd ios
pod install
cd ..