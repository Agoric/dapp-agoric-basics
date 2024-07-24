# Running `dapp-agoric-basics` on GHCS

This README outlines the instructions, directions, and steps currently being followed in this PR to make the experience of using GHCS more efficient. For the most part the instructions in the original README should work in this PR as well. However, the ultimate goal is to have a dApp running in a chain with a UI without having to follow any of those steps. This is currently achievable but it takes time and we want to reduce this wait time as much as possible.

## Important Steps

- A Dockerfile is introduced in `.devcontainer` directory that loads an image `mudassirshabbir/dab:mc3`. This image contains a linux system with node version `18.20`, GitHub CLI, Docker CLI, and current `dapp-agoric-basics` repo with `yarn install` already baked. 
- `dapp-agoric-basics` repo with `yarn install` is baked in `/usr/src/cache`.
- The Dockerfile is already configured in `devcontainer.json` file that is read by GHCS.
- Currently docker is loaded in `--privileged` mode mainly because we want to run docker-in-docker for chain using following `mount`:
```Dockerfile
"source=/var/run/docker.sock,target=/var/run/docker.sock,type=bind"
```
- There is an `entrypoint.sh` script that is used to copy the installed `node_modules` to the current workspaces that is mounted on `/workspace`.
- Instead of running `yarn start:docker` followed by `yarn start:contract`, we have created a docker image of the chain (`a3p`) with contract already deployed on it.
```sh
docker run -d -v ".:/workspace" mudassirshabbir/a3p:dab
```
This saves us about five minutes on average. Once done, we can simply run `yarn start:ui` and we are good to go.

## What Does Not Work at This Point

Currently, we need to perform `yarn install` manually. The work to bake it in first docker iamge is unfinished. The `/usr/src/cache` version of the repo has all the modules but copying it to `/workspace` does not provide intended results.

Below are some of the instructions that be needed to resume the task from here.

## Docker `dab:mc3` Image Construction

Docker image construction is done through `docker commit` command. The following instructions are needed to be run to create the first docker image:

```sh
docker run --privileged -it -v ".:/workspace" -v /var/run/docker.sock:/var/run/docker.sock   --platform linux/amd64 -p 26656:26656 -p 26657:26657 -p 1317:1317 node:18.20 /bin/bash

# Update package list and install dependencies
apt-get update
apt-get install -y curl

# Download and install GitHub CLI
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null
apt-get update
apt-get install -y gh

# Install Docker
apt-get update
apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker’s official GPG key
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up the stable repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io

# Enable Docker daemon
dockerd &
```

```sh
mkdir /usr/src/cache
cd /usr/src/cache
cp -r /workspace/* ./
yarn install 
```

After this point, I use `docker commit` to create an image.

## Docker `a3p:dab` Image Construction

This is done through straightforward `yarn start:docker`, `yarn start:contract`, followed by a `docker commit`. This can be automated through `compose` and/or `buid` but currently there is no need.