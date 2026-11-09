const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The app shares pure logic with the website. Only ../src is watched, not the repo root, so Metro
// does not crawl the website's node_modules or .next.
config.watchFolders = [path.resolve(__dirname, '../src')];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

module.exports = config;
