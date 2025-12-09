# Scenarios

Below we have listed a few scenarios that could help decide if you want to use SSM Cloud for your needs.

## Scenario #1

Want to play Satisfactory with friends and want to have the server running whilst you're asleep?
All you will need is a Spare computer that you feel safe to be left on overnight.

If you only plan to install one Dedicated server, we recommend just using the Standalone version of SSM Agent. This has direct access to the hardware its installed on.

You can do this in a few simple steps:

1. Register for an Account on our <a href="/signup">Sign Up Page</a>.
2. Create a Server on the Servers page.
3. Install SSM Agent using the standalone mode installer.
4. Install the Satisfactory Dedicated server through the Web Portal.
5. Then finally start the Server through the Dashboard.

## Scenario #2

You want to install multiple Satisfactory Dedicated servers but only have one machine?

You can do this by using our Docker Container to seperate multiple Server instances into their own isolated containers.

You can do this in a few simple steps:

1.  Register for an Account on our <a href="/signup">Sign Up Page</a>.
2.  Create a Server on the Servers page.
3.  Install SSM Agent using the Docker installer.
4.  Install the Satisfactory Dedicated server through the Web Portal.
5.  Then finally start the Server through the Dashboard.
6.  Repeat steps 2-5 for as many Servers you wish to run.

## Scenario #3

Are you wanting to start a Gaming Service for Satisfactory? SSM Cloud Can help with this!

SSM Offers a hosted version of SSM Cloud allowing you to install SSM Cloud on a Linux Machine.

This scenario is best for someone with a Dedicated Machine that can run multiple virtual machines for hosting SSM Agents.

The best approach would be the following:

-   One VM with 8GB Ram for Hosted SSM Cloud.
-   At least 2x VM with at least 16GB Ram for SSM Agents.
-   Create a new User Role that only allows Users to Start/Stop their Server through the dashboard.

Although SSM doesn't have the ability to automatically install/uninstall SSM Agent on a machine, This can be acheived with third party automation.

Here is a few steps this could be achieved:

-   Create a Webhook listener to listen for `agent.created` events sent from SSM Cloud
    -   On that event run the agent installer on a VM
-   Listen for the `agent.delete` events to uninstall the agent on the VM.
