# SSM Cloud API

SSM Cloud Api Overview

# Authentication

Satisfactory Server Manager Cloud uses an API Key to authenticate requests.
You can create a new API key on the account page.

API keys are linked to a user on your account and will take the permissions that the user role has been assigned.

Send the API key in the `x-ssm-key` header to authenticate each request.

## Login

Login through the login api endpoint to return your API keys

<div class="pill-wrapper pill-post">
    <span>POST</span> /api/v1/login
</div>

<!-- tabs:start -->

#### ** Request **

**Usage:**

```shell
    curl http://{URL}/api/v1/login -d "{Request Body}"
```

**Request Body:**

```json
{
    "email": "your_email",
    "password": "your_password"
}
```

#### ** Response **

**200: OK**

Login was successful

```js
{
    success: true,
    apikeys:[]
}
```

**404: Not Found**

User account was not found

```js
{
    success: false,
    error:"Some parameters are incorrect or missing."
}
```

<!-- tabs:end -->

# Account

## Get

Returns the account data.

<div class="pill-wrapper pill-get">
    <span>GET</span> /api/v1/account
</div>

<!-- tabs:start -->

#### ** Request **

**Usage:**

```shell
curl -H "x-ssm-key: {APIKEY}" \
     -l http://{URL}/api/v1/account
```

**Request Body:**

```
Request requires no body.
```

#### ** Response **

**200: OK**

Retrived the account successfully

```json
{
    "success": true,
    "account": {
        "_id": "6591799ab614792418e4e202",
        "accountName": "The Account Name",
        "users": [],
        "agents": [],
        "userRoles": [],
        "userInvites": [],
        "apiKeys": []
    }
}
```

**404: Not Found**

Account was not found

```json
{
    "success": false,
    "error": "Some parameters are incorrect or missing."
}
```

<!-- tabs:end -->

## Update

Update the accounts details

<div class="pill-wrapper pill-put">
    <span>PUT</span> /api/v1/account
</div>

<!-- tabs:start -->

#### ** Request **

**Usage:**

```shell
curl -H "x-ssm-key: {APIKEY}" \
     -d "{Request Body}" \
     -l http://{URL}/api/v1/account
```

**Request Body:**

```json
{
    "xAccountName": "The New Account Name"
}
```

#### ** Response **

**200: OK**

The account was successfully updated

```json
{
    "success": true,
    "account": {
        "_id": "6591799ab614792418e4e202",
        "accountName": "The New Account Name",
        "users": [],
        "agents": [],
        "userRoles": [],
        "userInvites": [],
        "apiKeys": []
    }
}
```

**404: Not Found**

Account was not found

```json
{
    "success": false,
    "error": "Some parameters are incorrect or missing."
}
```

<!-- tabs:end -->

# User

## Get

Get all users on the account.

<div class="pill-wrapper pill-get">
    <span>GET</span> /api/v1/users
</div>

<!-- tabs:start -->

#### ** Request **

**Usage:**

```shell
curl -H "x-ssm-key: {APIKEY}" \
     -l http://{URL}/api/v1/users
```

**Request Body:**

```
Request requires no body.
```

#### ** Response **

**200: OK**

Retrived the account successfully

```json
{
    "success": true,
    "users": []
}
```

<!-- tabs:end -->

## Get Single

Get a single user on the account.

<div class="pill-wrapper pill-get">
    <span>GET</span> /api/v1/users/{user_id}
</div>

<!-- tabs:start -->

#### ** Request **

**Usage:**

```shell
curl -H "x-ssm-key: {APIKEY}" \
     -l http://{URL}/api/v1/users/{user_id}
```

**Request Body:**

```
Request requires no body.
```

#### ** Response **

**200: OK**

Retrived the account successfully

```json
{
    "success": true,
    "user": {
        "_id": "6591799ab614792418e4e202",
        "email": "joe.bloggs.example.com",
        "isAccountAdmin": false,
        "role": "6591799ab614792418e4e202",
        "active": true
    }
}
```

**404: Not Found**

User was not found

```json
{
    "success": false,
    "user": null
}
```

<!-- tabs:end -->

## Create

Create a new user on the account.

<div class="pill-wrapper pill-post">
    <span>POST</span> /api/v1/users
</div>

<!-- tabs:start -->

#### ** Request **

**Usage:**

```shell
curl -H "x-ssm-key: {APIKEY}" \
     -d "{Request Body}"
     -l http://{URL}/api/v1/users
```

**Request Body:**

```json
{
    "xEmail": "joe.bloggs.example.com",
    "xPassword": "ABC123",
    "xConfirmPassword": "ABC123",
    "xRoleID": "6591799ab614792418e4e202",
    "xActive": true
}
```

#### ** Response **

**200: OK**

Retrived the account successfully

```json
{
    "success": true,
    "user": {
        "_id": "6591799ab614792418e4e202",
        "email": "joe.bloggs.example.com",
        "isAccountAdmin": false,
        "role": "6591799ab614792418e4e202",
        "active": true
    }
}
```

**404: Not Found**

User was not found

```json
{
    "success": false,
    "user": null
}
```

<!-- tabs:end -->
