<p align="center">
  <img src="/public/images/ssm_logo128.png" alt="ssm logo"/>
</p>

<h1 align="center">Satisfactory Server Manager Cloud Docs</h1>

## What is SSM?

Satisfactory Server Manager Cloud is a management web portal to manage locally hosted [SSM agents](#what-is-an-agent).

The web portal can easily manage and control the ssm agent, providing at-a-glace information about the performance and information.

> **NOTE:** SSM Cloud is designed to only provide a user interface to easily manage **your** Satisfactory Dedicated server and will not host any dedicated server instances in the cloud.

## Why Use SSM Cloud?

SSM Cloud is great to have all your satisfactory dedicated servers visible in one place.

Monitoring the performance, Updating the server, Viewing log files, Automatically creating backups and much more.

Having the ability to monitor multiple servers using SSM Cloud means, that you can have SSM agents installed on multiple servers around the world.

## What is an agent?

A SSM Agent is a small application that is installed on your own infrastructure, this application will Install, Update, Start/Stop the Satisfactory Dedicated Server.

> **NOTE:** Within SSM Cloud this is referred to as a server

There are two different methods of installing SSM Agent.

-   Running the Agent on the local machine and will be seperated by folder structure.
-   Running the Agent within a Docker Container.

## SSM Architecture

SSM Cloud is hosted on our Refined R&D Servers with a 10Gib internet connection. It is setup as a failover connection and will load balance between two SSM Cloud servers.

Below is a visual repersentation of how agents connect to SSM Cloud.

<p align="center">
  <img src="/public/images/docs_ssm_arch.png" alt="ssm architecture"/>
</p>
