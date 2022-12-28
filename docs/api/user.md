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
