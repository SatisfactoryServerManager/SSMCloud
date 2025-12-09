db = db.getSiblingDB("ssm");
db.dropAllUsers();
db.createUser({
    user: "ssm",
    pwd: "SSMPass",
    roles: ["readWrite", "dbAdmin"],
});
