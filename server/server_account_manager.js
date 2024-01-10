const EmailHandler = require("./server_email_handler");

const AccountModel = require("../models/account");
const AgentModel = require("../models/agent");
const logger = require("./server_logger");

const Config = require("./server_config");

class AccountManager {
    init() {
        this.CheckAccountActivity();
        this.PurgeInactiveAccounts();
        this.SetupTimers();
    }
    SetupTimers() {
        setInterval(async () => {
            await this.CheckAccountActivity();
            await this.PurgeInactiveAccounts();
        }, 10 * 1000);
    }

    CheckAccountActivity = async () => {
        if (Config.get("ssm.flags.deleteinactiveaccounts") == false) {
            return;
        }

        const Accounts = await AccountModel.find();

        try {
            for (let i = 0; i < Accounts.length; i++) {
                const Account = Accounts[i];

                await Account.populate("users");
                await Account.populate("agents");

                const dateNow = new Date();
                dateNow.setDate(dateNow.getDate() - 30);

                let AnyUserActive = false;

                for (let ui = 0; ui < Account.users.length; ui++) {
                    const user = Account.users[ui];

                    if (user.lastActiveDate.getTime() > dateNow.getTime()) {
                        AnyUserActive = true;
                    }
                }
                let AnyAgentActive = false;
                for (let ai = 0; ai < Account.agents.length; ai++) {
                    const Agent = Account.agents[ai];

                    if (Agent.lastCommDate.getTime() > dateNow.getTime()) {
                        AnyAgentActive = true;
                    }
                }

                if (AnyUserActive || AnyAgentActive) {
                    if (Account.state.inactive) {
                        Account.state.inactive = false;
                        Account.state.inactivityDate = null;
                        await AccountModel.updateOne(
                            { _id: Account._id },
                            { state: Account.state }
                        );
                    }
                    continue;
                }

                if (Account.state.inactive == false) {
                    Account.state.inactive = true;
                    Account.state.inactivityDate = new Date();

                    await AccountModel.updateOne(
                        { _id: Account._id },
                        { state: Account.state }
                    );

                    logger.info(
                        `Account ${Account.accountName} has been marked as inactive`
                    );
                }
            }
        } catch (err) {
            console.log(err);
        }
    };

    PurgeInactiveAccounts = async () => {
        if (Config.get("ssm.flags.deleteinactiveaccounts") == false) {
            return;
        }

        const Accounts = await AccountModel.find();

        try {
            for (let i = 0; i < Accounts.length; i++) {
                const Account = Accounts[i];
                if (Account.state.inactive == false) continue;

                const dateNow = new Date();
                dateNow.setDate(dateNow.getDate() - 30);

                if (
                    Account.state.inactivityDate.getTime() < dateNow.getTime()
                ) {
                    logger.info(
                        `Deleting Account Due to inactivity: ${Account.accountName} - ${Account._id}`
                    );

                    await AccountModel.deleteOne({ _id: Account._id });
                }
            }
        } catch (err) {
            console.log(err);
        }
    };
}

const accountManager = new AccountManager();

module.exports = accountManager;
