#!/bin/bash

echo "Building frontend..."
npm run build

echo "Copying functions to dist..."
cp -r functions dist/

echo "Build complete with functions!"