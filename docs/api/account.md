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
curl -H "x-ssm-key: {APIKEY}" -l http://{URL}/api/v1/account
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
