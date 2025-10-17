class AccountPage {
    constructor() {
        this._AuditList = [];
        this._AuditType = null;
        this._Users = [];
        this._UserInvites = [];
    }

    init() {
        if ($("#account-audit-wrapper").length == 0) return;

        this.PollAccountAudit();
        this.PollAccountUsers();
        setInterval(async () => {
            await this.PollAccountAudit();
            //await this.PollAccountUsers();
        }, 1000);

        $("body")
            .on("click", "#btn-adduser", (e) => {
                e.preventDefault();
                this.SendCreateAccountUser();
            })
            .on("click", ".copy-userinvite-btn", (e) => {
                const $this = $(e.currentTarget);

                navigator.clipboard.writeText($this.attr("data-invite-url"));
            });
    }

    PollAccountAudit = async () => {
        const auditType = $("#account-audit-types").val();
        if (this._AuditType == auditType) {
            return;
        }

        this._AuditType = auditType;

        const res = await $.get(`/dashboard/account/audit?type=${auditType}`);

        if (!res.success) {
            return;
        }

        this._AuditList = res.audit;

        this.BuildAuditList();
    };

    BuildAuditList() {
        const $wrapper = $("#account-audit-wrapper .row");
        $wrapper.empty();

        if (this._AuditList.length == 0) {
            $wrapper.append(
                `<div class="col-12"><div class="alert alert-info">No Audit Events recorded</div></div>`
            );
            return;
        }

        for (let i = 0; i < this._AuditList.length; i++) {
            const audit = this._AuditList[i];
            $wrapper.append(this.BuildAuditUI(audit));
        }
    }

    BuildAuditUI(audit) {
        const $col = $("<div/>").addClass("col-12 col-md-6 col-lg-4 col-xl-3");
        const $div = $("<div/>").addClass(
            "rounded account-audit-item mb-3 p-3"
        );

        let auditTypeString = "";
        switch (audit.type) {
            case "LOGIN_SUCCESS":
                auditTypeString = "Successful Login";
                break;
            case "LOGIN_FAILURE":
                auditTypeString = "Failed Login";
                break;
            case "CREATE_AGENT":
                auditTypeString = "New Agent";
                break;
            case "DELETE_AGENT":
                auditTypeString = "Agent Deleted";
                break;
            default:
                auditTypeString = "Unknown";
                break;
        }

        $div.append(`<h5 class="m-0">${auditTypeString}</h5>`);
        $div.append(`<div>${audit.createdAt}</div>`);
        $div.append(`<div>${audit.message}</div>`);
        $col.append($div);
        return $col;
    }

    PollAccountUsers = async () => {
        const res = await $.get(`/dashboard/account/users`);

        if (!res.success) {
            return;
        }

        this._Users = res.users;

        this.BuildUsersUI();
    };

    BuildUsersUI() {
        const $wrapper = $("#account-users-wrapper");
        $wrapper.empty();

        for (let i = 0; i < this._Users.length; i++) {
            const User = this._Users[i];

            $wrapper.append(this.BuildUserUI(User));
        }
    }

    BuildUserUI(User) {
        const $div = $("<div/>").addClass(
            "account-user rounded mb-3 p-3 d-flex flex-md-row flex-column align-items-center"
        );

        const $title = $(`<div class="mb-2 m-md-0"></div>`);
        const $icon = $(`<i class="fas fa-user me-2 fa-lg"></i>`);

        const $deleteBtn = $(
            `<button class="btn btn-danger delete-user-btn ms-md-auto"></button>`
        );

        $deleteBtn.append(`<i class="fas fa-trash"></i>`);
        $deleteBtn.append(
            `<span class="ms-2 d-md-none d-inline-block">Delete User</span>`
        );

        if (User.isAccountAdmin) {
            $icon.removeClass("fa-user").addClass("fa-user-shield");
            $deleteBtn.prop("disabled", true).removeClass("delete-user-btn");
        } else {
            $deleteBtn
                .attr("data-bs-toggle", "tooltip")
                .attr("data-bs-placement", "bottom")
                .attr("data-bs-title", "Delete User");

            new bootstrap.Tooltip($deleteBtn.get(0));
        }

        $title.append($icon);
        $title.append(`<h6 class="m-0 d-inline-block">${User.email}</h6>`);

        $div.append($title);
        $div.append($deleteBtn);

        return $div;
    }

    SendCreateAccountUser = async () => {
        const email = $("#inp_useremail").val();
        const _csrf = $("#account_csrf").val();
        const res = await $.post("/dashboard/account/users", { email, _csrf });
    };
}

const accountPage = new AccountPage();
module.exports = accountPage;
