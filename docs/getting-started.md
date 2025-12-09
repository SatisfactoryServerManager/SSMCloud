# Getting Started

# Gettings Started With SSM

## Registering a User

To get started using SSM you will first need to signup for an account.

We use Authentik for our identity provider hosted by us, you can login or register here: <a href="/auth/login">Login / Register page</a>

## Create Or Join An Account

To get started using SSM Cloud, you will need an account.

You can setup an account in the dashboard after logging in by going to the <a href="/dashboard/account/create">Create Account</a> page.

If you are joining an account you will need the Join Code of the account and then enter it in the <a href="/dashboard/account/join">Join Account</a> page.

### Why do I need an account?

When using SSM Cloud or Hosted SSM Cloud, an account is required. The account acts as a data store for the following information:

-   Agents
-   Audit
-   Integrations

# Servers

## Prerequisites

The following operating systems are supported:

-   Windows 10 and above
-   Windows Server 2019 and above (Standalone only)
-   Ubuntu 22.04 and above
-   Debian 10 and above

## Creating a Server

Creating a new server can be done using the <a href="/dashboard/server">Servers Page</a>

To create a new server click the `Create New Server` button. You will then be presented the Create New Server wizard

**Configuration Tab**

-   Server Name - The logical name of the server.
-   Server Port - The port that Satisfactory Server will run with.
-   Server Memory - The amount of Memory the server can use. (**Docker Install Only**)
-   Admin Password - The Satisfactory Server admin password
-   Client Password - The Satisfactory Server client password

Once filled in click the next button.

**Install Command Tab**

This tab will disable the install command for your operating system, it will be prepopulated with the information and you just need to copy and paste the command.

Once you have run the command in click the next button.

**Progress Tab**

The server is now created and will run a set of tasks to complete the install process (installing satisfactory, starting the server, claiming the server, setting the passwords, etc.)

Once you have created the server, you will get a success message.

### Running the install scripts

On the right of the Create new Server section, you will see the following:
![install new server section](images/createserver2.png)

There are two types of scripts:

-   Docker install
    -   Installs the server on a new docker container. This is the most supported, as it allows you to host multiple server instances on the same physical machine.
-   Standalone install
    -   Allows for multiple servers to be run directly on the physical machine

When running the script of your choice, you will be prompted to enter the following details:

-   SSM URL
    -   This is the URL of either your self-hosted SSM Cloud install or the default <a href="https://ssmcloud.hostxtra.co.uk">https://ssmcloud.hostxtra.co.uk</a>.
-   SSM Api Key
    -   This is the API key when creating a new server on the dashboard.

## Updating the Server

When on the <a href="/dashboard/servers">Servers Page</a> in the `Server List` section, you can see all your servers in the table.

When we release a new SSM Agent version on our <a href="https://github.com/SatisfactoryServerManager/SSMAgent">GitHub Repostitory</a> SSM Cloud will check this against the current version you are running.

The image below shows the current version and, on the right, the latest version.

![update agent version](images/updateserver1.png)

### How to update the Server

To update your server to the latest version, you can re-run the install script with the same parameters, URL and API key.

The Docker install scripts will ask you if you want to get the URL and API Key from the existing docker container for a more convenient update.
