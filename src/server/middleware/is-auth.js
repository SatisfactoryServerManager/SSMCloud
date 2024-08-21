import BackendAPI from "../utils/backend-api.js";

export async function IsAuth(req, res, next) {
    try {
        await BackendAPI.GET_APICall_Token(
            "/api/v1/account/session",
            req.session.token
        );
    } catch (err) {
        req.session.isLoggedIn = false;
        req.session.token = null;
    }

    if (!req.session.isLoggedIn) {
        return res.redirect("/login");
    }
    next();
}
