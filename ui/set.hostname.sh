#!/bin/bash

# Step 1: Read the environment variable CODESPACE_NAME
CODESPACE_NAME="${CODESPACE_NAME}"

# Check if the environment variable is set
if [ -z "$CODESPACE_NAME" ]; then
  echo "CODESPACE_NAME is not set."
  exit 1
fi

# Step 2: Define the file name
FILE="src/App.tsx"

# Check if the file exists
if [ ! -f "$FILE" ]; then
  echo "File $FILE does not exist."
  exit 1
fi

# Step 3: Search and replace the string in the file using a regular expression
sed -i "s|https://.*-1317\.app\.github\.dev/|https://${CODESPACE_NAME}-1317.app.github.dev/|g" "$FILE"
sed -i "s|https://.*-26657\.app\.github\.dev/|https://${CODESPACE_NAME}-26657.app.github.dev/|g" "$FILE"

# Step 4: Notify the user of completion
echo "Replaced matching URLs with https://${CODESPACE_NAME}-1317.app.github.dev/ in $FILE"
