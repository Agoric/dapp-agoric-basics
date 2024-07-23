# Use the base image from the provided Docker command
FROM mudassirshabbir/dab:mc3

# Expose the ports as specified in the docker run command
EXPOSE 26656
EXPOSE 26657
EXPOSE 1317
EXPOSE 5173

RUN "export NODE_PATH=/usr/src/cache/"
# Set the entrypoint or command if necessary (adjust as needed)
ENTRYPOINT ["/bin/bash"]

CMD "/bin/bash"
