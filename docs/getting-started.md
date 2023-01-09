# Getting Started

# Terminology

-   **SSM** - Satisfactory Server Manager.
-   **SSM Cloud** - Satisfactory Server Manager Cloud hosted web portal.
-   **SSM Hosted Cloud** - Satisfactory Server Manager locally hosted web portal.
-   **Agent / Server** - SSM Agent that manages the Satisfactory Server.

# Cloud vs Hosted Cloud

Below we cover the pros and cons of using cloud vs hosted cloud.

## SSM Cloud

**Pros:**

-   Hosted by the Refined R&D team.
-   Rapid Bug fixes.
-   Easy support channels.
-   Free of charge (Hardware).
-   No port-forwarding required.
-   Software is tested for our environment.

**Cons:**

-   Shared network connection.
-   Requires an internet connection.

## SSM Hosted Cloud

**Pros:**

-   Can be installed on low level hardware.
-   Can be installed locally on your network.

**Cons:**

-   Requires Port-forwarding if you want to access from the internet.
-   Bugs could be specific to your hardware.
-   Will require spare or purchase hardware.
-   Requires dependant software to be installed (MongoDB)
-   MongoDB will need to be secured before SSM installation.

# Account

## Create An Account

To get started using SSM Cloud you will need an account.

You can setup an account free of charge using the <a href="/signup">Sign Up Page</a>

On the sign up page you will need to enter the following information:

-   Account Details
    -   Account Name - This is the Organization/Community name
-   User Details
    -   Email Address - This is the first user that will be added to the account
    -   Password - Password for the user
    -   Confirm Password - Confirmation Password for the user

## Why do I need an account?

When using SSM Cloud or Hosted SSM Cloud an account is required. The account acts a data store for the following information:

-   API Keys
-   Agents
-   Invites
-   Users
-   User Roles
-   Webhooks

# Users

## Create a User

Creating a new user account can be done using the <a href="/dashboard/account">Account Page</a> under the `Users` section.

In this section you need to enter the Users email address, this is the email address the invite link will be sent to.

> **Note**: If you are using Hosted SSM Cloud it will show the invite link in the success message.

When creating a user you can assign a [User Role](#user-roles) this will add permissions to the user.

# User Roles

User roles are groups of permissions that a user can do with-in the UI.

By default we create three common user roles:

-   Administrator
-   Super User
-   User
