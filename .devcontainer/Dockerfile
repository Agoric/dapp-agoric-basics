# Use the base image from the provided Docker command
FROM mudassirshabbir/dab:mc3

# Set the working directory
WORKDIR /workspace

# Expose the ports as specified in the docker run command
EXPOSE 26656
EXPOSE 26657
EXPOSE 1317


# Set the entrypoint or command if necessary (adjust as needed)
ENTRYPOINT ["/bin/bash /workspaces/dapp-agoric-basics/make_ports_public.sh 26657 5173 1317"]
