# Overview

SSM Cloud Api Overview

## Authentication

Satisfactory Server Manager Cloud uses an API Key to authenticate requests.
You can create a new API key on the account page.

API keys are linked to a user on your account and will take the permissions that the user role has been assigned.

Send the API key in the `x-ssm-key` header to authenticate each request.

#### Login

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
