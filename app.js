const express = require("express");
const app = express();

// ENV
if (process.env.NODE_ENV !== "production") {
	require("dotenv").config();
}

// Body Parser
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));

// Sessions/Cookies
const cookieSession = require("cookie-session");

app.use(
	cookieSession({
		name: "session",
		keys: ["asdf1234567890qwer"]
	})
);

app.use((req, res, next) => {
	app.locals.session = req.session;
	next();
});

// Flash Messages
const flash = require("express-flash-messages");
app.use(flash());

// Referrer
app.use((req, res, next) => {
	req.session.backUrl = req.header("Referer") || "/";
	next();
});

// Logging
const morgan = require("morgan");
const highlight = require("cli-highlight").highlight;

// Add :data format token
// to `tiny` format
let format = [
	":separator",
	":newline",
	":method ",
	":url ",
	":status ",
	":res[content-length] ",
	"- :response-time ms",
	":newline",
	":newline",
	":data",
	":newline",
	":separator",
	":newline",
	":newline"
].join("");

// Use morgan middleware with
// custom format
app.use(morgan(format));

// Helper tokens
morgan.token("separator", () => "****");
morgan.token("newline", () => "\n");

// Set data token to output
// req query params and body
morgan.token("data", (req, res, next) => {
	let data = [];
	["query", "params", "body", "session"].forEach(key => {
		if (req[key]) {
			let capKey = key[0].toUpperCase() + key.substr(1);
			let value = JSON.stringify(req[key], null, 2);
			data.push(`${capKey}: ${value}`);
		}
	});
	data = highlight(data.join("\n"), {
		language: "json",
		ignoreIllegals: true
	});
	return `${data}`;
});

// Template Engine
const expressHandlebars = require("express-handlebars");
const helpers = require("./helpers");

const hbs = expressHandlebars.create({
	helpers,
	partialsDir: "views",
	defaultLayout: "application"
});

app.engine("handlebars", hbs.engine);
app.set("view engine", "handlebars");

// Routes
const EmailService = require("./services/email");

app.get("/", (req, res) => {
	res.render("users/register");
});

app.post("/register", (req, res, next) => {
	const text = `
	Its nodemailer my dudes\n
\n
	Welcome ${req.body.fname} ${req.body.lname}\n
\n
	Keep this info safe:\n
	Email: ${req.body.email}\n
	password: ${req.body.password}\n
\n
	take a shower\n
	`;

	const options = {
		from: "galford151@gmail.com",
		to: req.body.email,
		subject: `Welcome to nodemailer ${req.body.fname} ${req.body.lname}`,
		text: text,
		html: `<p>${text}</p>`
	};

	EmailService.send(options)
		.then(result => {
			result = JSON.stringify(result, 0, 2);
			req.flash("success", "Sent!");
			res.render("users/home", { result });
		})
		.catch(next);
});

// Server
const port = process.env.PORT || process.argv[2] || 3000;
const host = "localhost";

let args;
process.env.NODE_ENV === "production" ? (args = [port]) : (args = [port, host]);

args.push(() => {
	console.log(`Listening: http://${host}:${port}\n`);
});

app.listen.apply(app, args);

// Error Handling
app.use((err, req, res, next) => {
	if (res.headersSent) {
		return next(err);
	}
	res.status(500).render("errors/500", { error: err.stack });
});
