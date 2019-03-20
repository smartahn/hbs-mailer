# hbs-mailer

Simple email sender with handlebars

## Installation
```sh
$ npm install hbs-mailer
```

## Simple and easy way to register templates

hbs-mailer provides a easy way to register teamplates by key and send emails with minimum required information.

```js
const mailer = require('hbs-mailer');

mailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  secure: false,
  auth: {
    user: ...,
    pass: ...,
  }
});

await mailer.registerTemplates([{
  key: 'signup',
  template: '<p>Dear {{user.name}},<br>...',
  subject: 'Welcome',
}, {
  key: 'checkout',
  template: '<p>Dear {{user.name}},<br>...',
  subject: 'Checked out',
}]);

await mailer.sendEmail({
  key: 'signup',
  receiver: 'guest@guests.com',
  sender: 'mailer@mails.com'
});
```

## Table of contents

- [createTransport](#createTransport)
- [registerTemplate](#registerTemplate)
- [registerTemplates](#registerTemplates)
- [sendEmail](#sendEmail)
- [bind](#bind)
- [setLocals](#setLocals)
- [setOptions](#setOptions)


---


## createTransport

You can set node-mailer's SMTP transport options.
(https://nodemailer.com/smtp/).


```js
mailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  secure: false,
  auth: {
    user: ...,
    pass: ...,
  }
});
```

You can also set SMTP transport options when binding a instance to Requests.

```js
const app = express();
app.use(mailer.bind({
  host: "smtp.ethereal.email",
  port: 587,
  secure: false,
  auth: {
    user: ...,
    pass: ...,
  }
}));
```


[back to top](#table-of-contents)


---

## registerTemplate
## registerTemplates

You can register template(s) by key in various ways.
- as template string
- as template path
- as async function returning a template string and a subject

This method takes single template or array of templates.

```js
await mailer.registerTemplate({
  key: 'signup',
  template: '<p>Dear {{user.name}},<br>...',
  subject: 'Welcome',
});

await mailer.registerTemplates([{
  key: 'signup',
  template: '<p>Dear {{user.name}},<br>...',
  subject: 'Welcome',
}, {
  key: 'checkout',
  template: '<p>Dear {{user.name}},<br>...',
  subject: 'Checked out',
}]);
```

### Register a template as a template string

```js
await mailer.registerTemplate({
  key: 'signup',
  template: '<p>Dear {{user.name}},<br>...',
  subject: 'Welcome',
});
```

### Register a template as a template path
The template path is an absolute path and using 'path.resolve' is a suggested way to get the path.

```js
const path = require('path');

await mailer.registerTemplate({
  key: 'signup',
  templatePath: path.resolve('./signup.email.html'),
  subject: 'Welcome',
});
```

### Register a template as a value function
The value function is expected to return both template and subject to cover a case of retrieving them from db.
In case of db is the source of the templates, disable 'cache' option to get the current ones when sending emails.

```js
await mailer.registerTemplate({
  key: 'signup',
  valueFn: () => Promise.resolve({ template: '<p>Dear {{user.name}},<br>...', subject: 'Welcome' }),
});

await mailer.registerTemplate({
  key: 'signup',
  valueFn: () => {
    const Template = mongoose.model('Template');
    return Template.findOne({ key: 'signup' }).then(({ template, subject }) => { template, subject });   
  }),
});
```


[back to top](#table-of-contents)


---


## sendEmail

You can send emails by key with template data.

```js
await mailer.sendEmail({
  key: 'signup',
  receiver: 'guest@guests.com',
  sender: 'mailer@mails.com',
  data: { token: 'abcdefg' }
});
```

Before sending a email, subject and template html will be interpolated with data.

```html
<p>You can find your link below.</p>
<a href="http://www.test.com/api/signup/{{token}}" target="_blank">Link</a>
```

will be interpolated with data { token: 'abcdefg' }

```html
<p>You can find your link below.</p>
<a href="http://www.test.com/api/signup/abcdefg" target="_blank">Link</a>
```


[back to top](#table-of-contents)


---


## bind

You can bind 'sendEmail' method to request instances and find request-specific data into the templates.

```js
const app = express();

mailer.createTransport(...);
app.use(mailer.bind();

await mailer.registerTemplate({
  key: 'request-send-email',
  template: '<p>Your requested path is {{req.path}}</p>',
  subject: 'Request Path',
});

app.get('/api/test/request-send-email', function(req, res, next) {
  req.sendEmail({
    key: 'request-send-email',
    receiver: 'guest@guests.com',
    sender: 'mailer@mails.com'
  })
});
```
The request data you can find in templates are below:
- domain
- protocol
- hostname
- ip
- baseUrl
- originalUrl
- path
- body
- query
- params
- headers
- httpVersion

[back to top](#table-of-contents)


---


## setLocals

You can set global template data to use in any email templates.

```js
mailer.setLocals({ sender: 'mailer@mails.com' });
await mailer.sendEmail({
  key: 'signup',
  receiver: 'guest@guests.com',
  data: { token: 'abcdefg' }
});
```

[back to top](#table-of-contents)


---


## setOptions

'cache' option is the only option you can set for now.
- cache: if true, it caches handlebar instances created with subject and template html
* it won't update cached templates once cached, so in case of db changes, need to register the template again
or just disable 'cache' option.

```js
mailer.setOptions({ cache: true });
await mailer.registerTemplate(...);
```

[back to top](#table-of-contents)


---


### [MIT Licensed](LICENSE)