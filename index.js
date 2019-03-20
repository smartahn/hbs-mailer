/*!
 * hbs-mailer
 * Copyright(c) 2019 Junmin Ahn
 * MIT Licensed
 */

'use strict'

const fs = require('fs');
const nodemailer = require('nodemailer');
const Handlebars = require('handlebars');
const htmlToText = require('html-to-text');

const isArray = Array.isArray;

let _smtpTransport;
let _locals;

const _options = {
  cache: false,
};

const _templates = Object.create(null);
const _cached = Object.create(null);

/**
 * Helpers
 */
const isFunction = function(value) {
  return typeof value === 'function';
};

const readFileAsync = function(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, function(err, content) {
      if (err) return reject(err)
      return resolve(content.toString());
    })
  });
};

/**
 * Set the mailer transport options.
 */
const createTransport = function(options) {
  _smtpTransport = nodemailer.createTransport(options);
  return this;
};

/**
 * Set global handlebar input data.
 */
const setLocals = function(locals = {}) {
  _locals = locals;
};

/**
 * Set options.
 *   cache: boolean | cache template data
 */
const setOptions = function(options = {}) {
  Object.assign(_options, options);
};

/**
 * Get handlebar instances for subject and html body.
 *   valueFn expects to be an asynchronous function returning template, subject.
 *   template expects to be an template string.
 *   templatePath expects to be an url of the template 
 */
const getTemplate = function({ template, templatePath, subject, valueFn }) {
  if (valueFn) {
    return valueFn().then(({ template, subject }) => {
      return {
        subject: Handlebars.compile(subject),
        html: Handlebars.compile(template)
      };
    });
  } else {
    const templateProm = template ?
      Promise.resolve(template) :
      readFileAsync(templatePath).catch(err => {
        console.error(err);
        return 'no template';
      });

    return templateProm.then(template => {
      return {
        subject: Handlebars.compile(subject),
        html: Handlebars.compile(template)
      };
    });
  }
};

/**
 * Register a single template.
 *   if cache option is set to true, store handlebar instances for subject and html body.
 *   if not, create handlebar instances as sending emails.
 */
const _registerTemplate = function({ key, template, templatePath, subject, valueFn }) {
  if (_options.cache) {
    return getTemplate({ template, templatePath, subject, valueFn })
      .then(({ subject, html }) => {
        _cached[key] = { subject, html };
        return _cached[key];
      });

  } else {
    _templates[key] = { template, templatePath, subject, valueFn };
    return Promise.resolve(_templates[key]);
  }
};

/**
 * Register a single template or more than one templates.
 */
const registerTemplates = function(templates) {
  return isArray(templates) ?
    Promise.all(templates.map(_registerTemplate)) :
    _registerTemplate(templates);
};

/**
 * Send an email using node mailer.
 *   in this state, subject and html body are interpolated.
 */
const send = function({
  from = 'sender@example.com', // sender address
  to = 'receiver1@example.com, receiver2@example.com', // list of receivers
  subject = 'Hello There', // Subject line
  html = '<b>Hello There?</b>', // html body
  text = htmlToText.fromString(html, { wordwrap: 130 }), // plain text body
}) {
  return new Promise((resolve, reject) => {
    if (!_smtpTransport) return reject(new Error('plz create a smtp transport first! hbs-mailer.createTransport(opts)...'))

    // disable for now untile email works!
    _smtpTransport.sendMail({ from, to, subject, text, html }, (err, info) => {
      if (err) reject(err);
      else {
        info.subject = subject;
        info.html = html;
        info.text = text;
        resolve(info);
      }
    });
  });
};

/**
 * Interpolate subject and html body with input data and send email.
 */
const sendEmail = function({ key, data, receiver, sender, extraData }) {
  let templateProm;
  if (_options.cache) {
    if (!_cached[key]) return Promise.reject(`email template '${key}' has not been registered!`);
    templateProm = Promise.resolve(_cached[key]);
  } else {
    if (!_templates[key]) return Promise.reject(`email template '${key}' has not been registered!`);
    templateProm = getTemplate(_templates[key]);
  }

  return templateProm.then(template => {
    if (!template) throw new Error(`template ${key} is not registered!`);

    const locals = Object.assign({}, { receiver, sender }, _locals, data, extraData);
    const subject = template.subject(locals);
    const html = template.html(locals);

    if (!sender) sender = locals.sender;
    if (!sender) return Promise.reject(new Error('sender information is not provided!'));

    const options = {
      from: sender.email || sender,
      to: receiver.email || receiver,
      subject,
      html
    };

    return send(options);
  });
};

/**
 * Bind request data to handlebar input data and create a method in request.
 */
const bind = function(transportOptions) {
  if (transportOptions) createTransport(transportOptions);

  return function(req, res, next) {
    req.sendEmail = function({ key, data, receiver, sender }) {
      const extraData = {
        app: req.app.locals,
        req: {
          domain: req.domain,
          protocol: req.protocol,
          hostname: req.hostname,
          ip: req.ip,
          baseUrl: req.baseUrl,
          originalUrl: req.originalUrl,
          path: req.path,
          body: req.body,
          query: req.query,
          params: req.params,
          headers: req.headers,
          httpVersion: req.httpVersion,
        }
      };
      return sendEmail({ key, data, receiver, sender, extraData });
    }
    next()
  };
};

/**
 * Export methods.
 */
module.exports = exports = {
  createTransport,
  setLocals,
  setOptions,
  registerTemplate: _registerTemplate,
  registerTemplates,
  sendEmail,
  bind,
};
